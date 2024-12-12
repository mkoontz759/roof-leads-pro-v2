const mongoose = require('mongoose');
const logger = require('../services/LoggerService');

const connectDB = async () => {
  try {
    // Set strictQuery to false to prepare for Mongoose 7
    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    // Don't exit in production, let the app keep running
    if (process.env.NODE_ENV === 'production') {
      logger.error('Failed to connect to MongoDB, will retry...');
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;