const DEFAULT_TIMEZONE = 'America/Chicago';

class DateService {
    static formatDateTime(date) {
        if (!date) return 'N/A';
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return 'N/A';

            return dateObj.toLocaleString('en-US', {
                timeZone: DEFAULT_TIMEZONE,
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            });
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'N/A';
        }
    }

    static getDateFilter(filterType) {
        const now = new Date();
        switch (filterType) {
            case '24h':
                return new Date(now - 24 * 60 * 60 * 1000);
            case '5d':
                return new Date(now - 5 * 24 * 60 * 60 * 1000);
            case '1w':
                return new Date(now - 7 * 24 * 60 * 60 * 1000);
            case '1m':
                return new Date(now - 30 * 24 * 60 * 60 * 1000);
            default:
                return null;
        }
    }

    static isWithinDateRange(date, filterType) {
        if (!filterType || filterType === 'all') return true;
        const dateLimit = this.getDateFilter(filterType);
        return new Date(date) >= dateLimit;
    }
}

module.exports = DateService; 