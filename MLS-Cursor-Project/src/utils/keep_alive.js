const axios = require('axios');
const logger = require('../services/LoggerService');

function keepAlive() {
  setInterval(async () => {
    try {
      const response = await axios.get(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/health`);
      logger.info('Keep-alive ping successful:', response.status);
    } catch (error) {
      logger.error('Keep-alive ping failed:', error.message);
    }
  }, 5 * 60 * 1000); // Ping every 5 minutes
}

module.exports = keepAlive; 