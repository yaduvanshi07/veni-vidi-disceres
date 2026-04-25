'use strict';

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config();

// ── Validate required env vars at startup ──────────────────────────────────────
const REQUIRED_ENV = ['MONGODB_URI', 'SESSION_SECRET', 'GEMINI_API_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ── Trust reverse proxy (required for secure cookies on Render) ───────────────
if (isProd) app.set('trust proxy', 1);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProd ? '7d' : 0,
  etag: true
}));

// ── View engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Session configuration ─────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native'
  }),
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'lax' : false
  }
}));

// ── MongoDB connection with retry ─────────────────────────────────────────────
const connectDB = async (retries = 5, delay = 3000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('[DB] Connected to MongoDB');
      return;
    } catch (err) {
      console.error(`[DB] Connection attempt ${i}/${retries} failed:`, err.message);
      if (i < retries) await new Promise((r) => setTimeout(r, delay));
    }
  }
  console.error('[FATAL] Could not connect to MongoDB after multiple retries. Exiting.');
  process.exit(1);
};

connectDB();

mongoose.connection.on('disconnected', () => console.warn('[DB] MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('[DB] MongoDB reconnected'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', require('./routes/browse'));
app.use('/', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/documents', require('./routes/documents'));
app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));
app.use('/analytics', require('./routes/analytics'));
app.use('/study', require('./routes/study'));
app.use('/institution', require('./routes/institution'));
app.use('/marketplace', require('./routes/marketplace'));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    error: 'Page not found',
    user: req.session.user || null
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[ERROR] ${req.method} ${req.url} →`, err.stack || err.message);
  res.status(status).render('error', {
    error: isProd ? 'Something went wrong. Please try again.' : err.message,
    user: req.session?.user || null
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 3000;
const server = app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT} (${isProd ? 'production' : 'development'})`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`[SERVER] Received ${signal}. Gracefully shutting down…`);
  server.close(async () => {
    await mongoose.connection.close();
    console.log('[SERVER] Server and DB connections closed.');
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  process.exit(1);
});
