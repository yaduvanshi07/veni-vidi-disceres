// Authentication middleware — verifies an active session exists
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  // Save original URL so we can redirect after login
  req.session.returnTo = req.originalUrl;
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  res.redirect('/login');
};

// Admin middleware — requires role === 'admin'
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    return next();
  }
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(403).json({ success: false, message: 'Admin privileges required' });
  }
  res.status(403).render('error', {
    error: 'Access denied. Admin privileges required.',
    user: req.session.user || null
  });
};

module.exports = { requireAuth, requireAdmin };
