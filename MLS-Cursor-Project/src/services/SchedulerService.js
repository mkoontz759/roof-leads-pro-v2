const cron = require('node-cron');
const logger = require('./LoggerService');

class SchedulerService {
    constructor(mlsService, databaseService, webhookService) {
        this.mlsService = mlsService;
        this.db = databaseService;
        this.webhookService = webhookService;
        this.lastSyncTime = new Date();
    }

    getLastSyncTime() {
        return this.lastSyncTime;
    }

    async startScheduledTasks() {
        // Run initial sync immediately when service starts
        await this.runSync();
        console.log('Initial sync completed at:', this.lastSyncTime);

        // Then schedule future syncs
        cron.schedule('*/15 * * * *', async () => {
            await this.runSync();
        });

        logger.info('Scheduled tasks started - running every 15 minutes');
    }

    async runSync() {
        logger.info('Starting scheduled MLS sync job');
        try {
            const mlsData = await this.mlsService.getNewPendingContracts();
            const result = await this.mlsService.storeMLSData(mlsData);

            // Update lastSyncTime after all operations complete
            this.lastSyncTime = new Date();

            logger.info('MLS sync completed successfully', {
                agents: result.agents,
                listings: result.listings,
                syncTime: this.formatTime(this.lastSyncTime)
            });

        } catch (error) {
            logger.error('Error in scheduled MLS sync:', error);
        }
    }

    formatTime(date) {
        return date.toLocaleString('en-US', {
            timeZone: 'America/Chicago',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    }
}

// Create and export a singleton instance
let instance = null;

function initializeSchedulerService(mlsService, databaseService, webhookService) {
    if (!instance) {
        instance = new SchedulerService(mlsService, databaseService, webhookService);
    }
    return instance;
}

function getSchedulerService() {
    return instance;
}

module.exports = {
    initializeSchedulerService,
    getSchedulerService
}; 