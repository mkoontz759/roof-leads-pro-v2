
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

// Rest of your existing index.js code...
// (keeping all the same code, just fixing the import paths)
