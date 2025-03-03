
require('dotenv').config();

// Add this to verify environment variables are loaded
console.log('Environment check:', {
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasSessionSecret: !!process.env.SESSION_SECRET
});

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const cron = require('node-cron');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./services/LoggerService');
const keepAlive = require('./utils/keep_alive');
const winston = require('winston');
const MongoStore = require('connect-mongo');

// Import routes
const indexRouter = require('./routes/index');
const authRoutes = require('./routes/auth');

// Import services
const DatabaseService = require('./services/DatabaseService');
const WebhookService = require('./services/WebhookService');
const MLSService = require('./services/MLSService');
const { initializeSchedulerService } = require('./services/SchedulerService');

// Import middleware
const { protect } = require('./middleware/auth');

// Initialize express
const app = express();

// Initialize services
const db = new DatabaseService();
const mlsService = new MLSService(logger);
const webhookService = new WebhookService();
const schedulerService = initializeSchedulerService(mlsService, db, webhookService);

// Add these debug logs
console.log('Starting scheduler service...');
schedulerService.startScheduledTasks().then(() => {
    console.log('Scheduler service started, initial sync completed');
    console.log('Last sync time:', schedulerService.getLastSyncTime());
}).catch(error => {
    console.error('Error starting scheduler:', error);
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'your-mongodb-connection-string',
        ttl: 24 * 60 * 60 // Session TTL (1 day)
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Flash messages middleware
app.use(flash());

// Global variables middleware
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.errors = req.flash('error');
  res.locals.successes = req.flash('success');
  next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes setup
app.get('/', (req, res) => res.redirect('/dashboard'));
app.use('/auth', authRoutes);
app.use('/dashboard', protect, indexRouter);

// Error handling middleware
app.use(errorHandler);

// Start the keep-alive ping
keepAlive();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});
