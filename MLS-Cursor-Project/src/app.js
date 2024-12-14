const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const logger = require('./services/LoggerService');
const flash = require('connect-flash');
const DateService = require('./services/DateService');
const passport = require('passport');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Add these debug lines
app.use(flash());
app.use((req, res, next) => {
    console.log('Flash messages:', req.flash());
    next();
});

app.use(passport.initialize());
app.use(passport.session());

// Add these passport serialization methods
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Make DateService available globally to all views
app.locals.DateService = DateService;

// Routes
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

const authRouter = require('./routes/auth');
app.use('/auth', authRouter);

// Error handler
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).render('error', { 
        message: 'Something broke!',
        error: process.env.NODE_ENV === 'development' ? err : {},
        DateService
    });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name')
    .then(() => logger.info('Connected to MongoDB'))
    .catch(err => logger.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server is running on port ${PORT}`);
});

module.exports = app; 