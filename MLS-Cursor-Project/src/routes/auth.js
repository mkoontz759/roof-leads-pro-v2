const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      req.flash('error', 'User already exists');
      return res.redirect('/register');
    }

    // Create new user
    user = new User({
      name: {
        first: firstName,
        last: lastName
      },
      email,
      password,
      phone
    });

    await user.save();

    // Generate token and store in session
    const token = user.generateAuthToken();
    req.session.token = token;

    req.flash('success', 'Registration successful');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'Registration failed');
    res.redirect('/register');
  }
});

// @route   POST /auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });

    // Get user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('User not found');
      req.flash('error', 'Invalid credentials');
      return res.redirect('/auth/login');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password incorrect');
      req.flash('error', 'Invalid credentials');
      return res.redirect('/auth/login');
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token and store in session
    const token = user.generateAuthToken();
    req.session.token = token;

    console.log('Login successful:', { userId: user._id });
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'Login failed');
    res.redirect('/auth/login');
  }
});

// @route   GET /auth/logout
// @desc    Logout user / clear session
// @access  Private
router.get('/logout', protect, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

// @route   GET /auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.render('profile', { user });
  } catch (error) {
    console.error('Profile error:', error);
    req.flash('error', 'Error loading profile');
    res.redirect('/dashboard');
  }
});

// @route   PUT /auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone, leadConnectorWebhook } = req.body;

    const user = await User.findById(req.user.id);

    user.name.first = firstName || user.name.first;
    user.name.last = lastName || user.name.last;
    user.phone = phone || user.phone;
    user.leadConnectorWebhook = leadConnectorWebhook || user.leadConnectorWebhook;

    await user.save();

    req.flash('success', 'Profile updated successfully');
    res.redirect('/auth/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.flash('error', 'Error updating profile');
    res.redirect('/auth/profile');
  }
});

// Add this route to check auth status
router.get('/login', (req, res) => {
    // If user is already logged in, redirect to dashboard
    if (req.session.token) {
        return res.redirect('/dashboard');
    }
    res.render('login', { errors: req.flash('error') });
});

router.get('/register', (req, res) => {
    // If user is already logged in, redirect to dashboard
    if (req.session.token) {
        return res.redirect('/dashboard');
    }
    res.render('register', { errors: req.flash('error') });
});

module.exports = router; 