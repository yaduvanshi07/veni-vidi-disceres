const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// ── Helpers ───────────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

// Redirect already-authenticated users away from auth pages
const redirectIfAuth = (req, res, next) => {
  if (req.session && req.session.userId) return res.redirect('/marketplace');
  next();
};

// ── SIGNUP ────────────────────────────────────────────────────────────────────
router.get('/signup', redirectIfAuth, (req, res) => {
  res.render('signup', { error: null, user: null });
});

router.post('/signup', redirectIfAuth, async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validate inputs
    if (!username || !email || !password || !confirmPassword) {
      return res.render('signup', { error: 'All fields are required', user: null });
    }
    if (!USERNAME_REGEX.test(username)) {
      return res.render('signup', { error: 'Username can only contain letters, numbers and underscores', user: null });
    }
    if (username.length < 3 || username.length > 30) {
      return res.render('signup', { error: 'Username must be between 3 and 30 characters', user: null });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.render('signup', { error: 'Please enter a valid email address', user: null });
    }
    if (password.length < 6) {
      return res.render('signup', { error: 'Password must be at least 6 characters', user: null });
    }
    if (password !== confirmPassword) {
      return res.render('signup', { error: 'Passwords do not match', user: null });
    }

    // Check duplicates
    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existing) {
      return res.render('signup', { error: 'Username or email already exists', user: null });
    }

    // Create user
    const user = new User({ username, email, password });
    await user.save();

    // Set session
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      preferences: user.preferences
    };

    res.redirect('/marketplace');
  } catch (error) {
    console.error('[AUTH] Signup error:', error);
    res.render('signup', { error: 'An error occurred. Please try again.', user: null });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('login', { error: null, user: null });
});

router.post('/login', redirectIfAuth, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login', { error: 'Email and password are required', user: null });
    }

    // Load user WITH password field (select: false on model)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.isActive) {
      return res.render('login', { error: 'Invalid email or password', user: null });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', { error: 'Invalid email or password', user: null });
    }

    // Update lastLoginAt without saving the whole document
    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    // Set session
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      preferences: user.preferences
    };

    const returnTo = req.session.returnTo || '/marketplace';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.render('login', { error: 'An error occurred. Please try again.', user: null });
  }
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('[AUTH] Logout error:', err);
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = router;
