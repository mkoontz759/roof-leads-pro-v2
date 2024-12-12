const axios = require('axios');
const logger = require('./LoggerService');

class WebhookService {
  constructor() {
    this.webhookUrl = process.env.WEBHOOK_URL;
  }

  async sendToLeadConnector(agent) {
    try {
      if (!this.webhookUrl) {
        logger.warn('No webhook URL configured, skipping webhook');
        return;
      }

      logger.info('Sending agent to webhook:', {
        name: agent.name,
        mlsId: agent.mlsId
      });

      await axios.post(this.webhookUrl, agent);

      logger.info('Successfully sent agent to webhook');
    } catch (error) {
      logger.error('Error sending to webhook:', {
        message: error.message,
        response: error.response?.data
      });
      // Don't throw the error - we don't want webhook failures to break the sync
    }
  }
}

module.exports = WebhookService; 