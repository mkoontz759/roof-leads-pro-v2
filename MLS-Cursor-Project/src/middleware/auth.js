const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - JWT verification
exports.protect = async (req, res, next) => {
    // Public routes that don't need authentication
    const publicRoutes = ['/auth/login', '/auth/register'];
    // Protected routes that should redirect to dashboard if not authenticated
    const protectedRoutes = ['/cards', '/list', '/map', '/settings', '/account'];

    if (publicRoutes.includes(req.path)) {
        return next();
    }

    try {
        const token = req.session.token;
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error('JWT_SECRET is not configured');
            return res.redirect('/auth/login');
        }

        // If no token and trying to access protected route, redirect to login
        if (!token) {
            // Store the requested URL for redirect after login
            if (protectedRoutes.includes(req.path)) {
                req.session.returnTo = req.originalUrl;
            }
            if (req.path !== '/auth/login') {
                return res.redirect('/auth/login');
            }
            return next();
        }

        // Verify token
        const decoded = jwt.verify(token, secret);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            req.session.destroy();
            return res.redirect('/auth/login');
        }

        // User is authenticated
        req.user = user;
        res.locals.user = user;
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        req.session.destroy();
        res.redirect('/auth/login');
    }
};

// Admin check middleware
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).render('error', {
            message: 'Access denied. Admin privileges required.'
        });
    }
};

// Add utility function to generate JWT
exports.generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};

// Add flash messages middleware
exports.setFlashMessages = (req, res, next) => {
    res.locals.errors = req.flash('error');
    res.locals.successes = req.flash('success');
    next();
};