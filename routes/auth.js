const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// Home page route moved to browse.js
// router.get('/', ...);


// Signup page
router.get('/signup', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/marketplace');
  }
  res.render('signup', { error: null, user: null });
});

// Signup handler
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.render('signup', {
        error: 'All fields are required',
        user: null
      });
    }

    if (password !== confirmPassword) {
      return res.render('signup', {
        error: 'Passwords do not match',
        user: null
      });
    }

    if (password.length < 6) {
      return res.render('signup', {
        error: 'Password must be at least 6 characters',
        user: null
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.render('signup', {
        error: 'Username or email already exists',
        user: null
      });
    }

    // Create user
    const user = new User({ username, email, password });
    await user.save();

    // Reload user to get default preferences
    const savedUser = await User.findById(user._id);

    // Set session
    req.session.userId = savedUser._id;
    req.session.username = savedUser.username;
    req.session.role = savedUser.role;
    req.session.user = {
      id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role,
      preferences: savedUser.preferences
    };

    res.redirect('/marketplace');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('signup', {
      error: 'An error occurred. Please try again.',
      user: null
    });
  }
});

// Login page
router.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/marketplace');
  }
  res.render('login', { error: null, user: null });
});

// Login handler
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login', {
        error: 'Email and password are required',
        user: null
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', {
        error: 'Invalid email or password',
        user: null
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', {
        error: 'Invalid email or password',
        user: null
      });
    }

    // Set session
    req.session.userId = user._id;
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
    console.error('Login error:', error);
    res.render('login', {
      error: 'An error occurred. Please try again.',
      user: null
    });
  }
});

// Logout handler
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/marketplace');
    }
    res.redirect('/');
  });
});

module.exports = router;

