const mongoose = require('mongoose');
const env = require('./environment');
const logger = require('../utils/logger');

const connectDB = async (retries = 5, delay = 5000) => {
  while (retries > 0) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
      });
      logger.info('MongoDB Connected');
      return;
    } catch (err) {
      logger.error(`MongoDB connection error: ${err.message}`);
      retries -= 1;
      logger.info(`Retries left: ${retries}`);
      if (retries === 0) {
        logger.error('Failed to connect to MongoDB after multiple attempts');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

module.exports = { connectDB };
