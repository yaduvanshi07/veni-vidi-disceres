// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    return next();
  }
  res.status(403).render('error', {
    error: 'Access denied. Admin privileges required.',
    user: req.session.user || null
  });
};

module.exports = { requireAuth, requireAdmin };

