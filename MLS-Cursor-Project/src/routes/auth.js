const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('Setting up Google Strategy with:', {
    callbackURL: process.env.GOOGLE_CALLBACK_URL
});

// Initialize Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    console.log('Google OAuth Attempt:', { 
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        googleId: profile.id
    });

    try {
        // Check if user exists
        let user = await User.findOne({ email: profile.emails[0].value });
        console.log('Existing user found:', !!user);

        if (!user) {
            console.log('Creating new user with profile:', {
                email: profile.emails[0].value,
                name: profile.displayName,
                googleId: profile.id
            });

            user = await User.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
                googleId: profile.id
            });
        }

        return done(null, user);
    } catch (error) {
        console.log('Google OAuth Error:', {
            error: error.message,
            stack: error.stack,
            email: profile.emails?.[0]?.value
        });
        return done(error, null);
    }
}));

// Explicitly log route registration
console.log('Registering Google auth routes');

router.get('/google', (req, res, next) => {
    console.log('Google auth route hit');
    passport.authenticate('google', { 
        scope: ['profile', 'email']
    })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
    console.log('Google callback route hit');
    passport.authenticate('google', { 
        failureRedirect: '/auth/login',
        failureFlash: true,
        session: true
    })(req, res, next);
}, (req, res) => {
    console.log('Authentication successful for user:', req.user);

    // Set session data
    req.session.token = jwt.sign(
        { id: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    req.session.user = {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name
    };

    // Save session before redirect
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.redirect('/auth/login');
        }
        console.log('Session saved, redirecting to dashboard');
        res.redirect('/dashboard');
    });
});

router.get('/login', (req, res) => {
    // Get error from session
    const error = req.session.loginError;
    // Clear the error after reading it
    delete req.session.loginError;

    console.log('Login page rendered with error:', error);

    res.render('auth/login', {
        title: 'Login',
        error: error,
        isAuthenticated: !!req.user
    });
});

passport.serializeUser((user, done) => {
    console.log('Serializing User:', { userId: user.id });
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    console.log('Deserializing User:', { userId: id });
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.log('Deserialize Error:', {
            error: error.message,
            userId: id
        });
        done(error, null);
    }
});

router.get('/logout', (req, res) => {
    console.log('Logging out user');

    // Clear Passport session
    req.logout(function(err) {
        if (err) {
            console.error('Logout error:', err);
        }

        // Clear session data
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }

            // Redirect to login page
            res.redirect('/auth/login');
        });
    });
});

// POST /auth/login - Handle login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login Attempt Started:', { email, timestamp: new Date().toISOString() });

        const user = await User.findOne({ email });
        console.log('User found:', !!user);

        if (!user) {
            req.session.loginError = 'Invalid email or password';
            return res.redirect('/auth/login');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);

        if (!isMatch) {
            console.log('Invalid password for user:', email);
            req.session.loginError = 'Invalid email or password';
            return res.redirect('/auth/login');
        }

        // Create token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        console.log('Token created for user:', email);

        // Set session
        req.session.token = token;
        req.session.user = {
            id: user._id,
            email: user.email,
            name: user.name
        };

        console.log('Session set for user:', email);

        const returnTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;

        console.log('Return to path:', returnTo);
        return res.redirect(returnTo);

    } catch (error) {
        console.log('Login error:', error);
        req.session.loginError = 'An error occurred during login';
        return res.redirect('/auth/login');
    }
});

// GET /auth/register - Show registration form
router.get('/register', (req, res) => {
    res.render('auth/register', {
        title: 'Register',
        error: req.flash('error')
    });
});

// POST /auth/register - Handle registration
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email already registered');
            return res.redirect('/auth/register');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        // Log them in automatically
        req.session.token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        req.session.user = {
            id: user._id,
            email: user.email,
            name: user.name
        };

        res.redirect('/dashboard');
    } catch (error) {
        console.log('Registration error:', {
            error: error.message,
            stack: error.stack
        });
        req.flash('error', 'Error during registration');
        res.redirect('/auth/register');
    }
});

// GET /auth/forgot-password - Show forgot password form
router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Forgot Password',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// POST /auth/forgot-password - Handle forgot password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error', 'No account found with that email');
            return res.redirect('/auth/forgot-password');
        }

        // Generate password reset token
        const resetToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Store the reset token and expiry
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // TODO: Send password reset email
        console.log('Password reset requested:', {
            email: email,
            token: resetToken,
            expires: new Date(Date.now() + 3600000)
        });

        req.flash('success', 'Password reset instructions sent to your email');
        res.redirect('/auth/forgot-password');
    } catch (error) {
        console.log('Forgot password error:', {
            error: error.message,
            stack: error.stack,
            email: req.body?.email
        });
        req.flash('error', 'Error processing password reset');
        res.redirect('/auth/forgot-password');
    }
});

module.exports = router;