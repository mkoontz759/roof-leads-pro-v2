const cron = require('node-cron');
const logger = require('./LoggerService');
const DateService = require('./DateService');

function initializeSchedulerService(mlsService, databaseService, webhookService) {
    const scheduledTasks = [];
    let lastSyncTime = null;

    return {
        startScheduledTasks: async () => {
            // Only schedule the task, don't run immediately
            const mlsSync = cron.schedule('*/15 * * * *', async () => {
                try {
                    const startTime = Date.now();
                    logger.info('Starting scheduled MLS sync job');
                    const mlsData = await mlsService.getNewPendingContracts();
                    const result = await mlsService.storeMLSData(mlsData);

                    lastSyncTime = new Date();

                    logger.info('MLS sync completed successfully', {
                        agents: result.agents,
                        listings: result.listings,
                        syncTime: lastSyncTime.toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                        }),
                        timeTaken: `${((Date.now() - startTime) / 1000).toFixed(2)} seconds`
                    });
                } catch (error) {
                    logger.error('MLS sync failed:', error);
                }
            }, {
                scheduled: false  // Don't start immediately
            });

            // Start the scheduled task
            mlsSync.start();
            scheduledTasks.push(mlsSync);

            logger.info('Scheduled tasks started - running every 15 minutes');
        },

        stopScheduledTasks: async () => {
            scheduledTasks.forEach(task => task.stop());
            logger.info('Scheduled tasks stopped');
        },

        getLastSync: () => {
            return lastSyncTime || new Date();
        }
    };
}

module.exports = { initializeSchedulerService }; 