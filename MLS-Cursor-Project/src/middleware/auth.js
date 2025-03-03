exports.protect = async (req, res, next) => {
    try {
        // Check if user is authenticated via Passport or session token
        if (!req.isAuthenticated() && !req.session.token) {
            console.log('User not authenticated, redirecting to login');
            // Store the intended destination
            req.session.returnTo = req.originalUrl;
            return res.redirect('/auth/login');
        }

        // Log authentication state
        console.log('User authenticated:', {
            isPassportAuth: req.isAuthenticated(),
            hasSessionToken: !!req.session.token,
            user: req.user
        });

        // Initialize or maintain filter state
        if (!req.session.filters) {
            req.session.filters = {
                dateFilter: 'all',
                priceFilter: 'all',
                zipCodes: [],
                limit: 12
            };
        }

        // Update filters if provided in query
        if (req.query.dateFilter) req.session.filters.dateFilter = req.query.dateFilter;
        if (req.query.priceFilter) req.session.filters.priceFilter = req.query.priceFilter;
        if (req.query.zipCodes) req.session.filters.zipCodes = req.query.zipCodes.split(',');
        if (req.query.limit) req.session.filters.limit = parseInt(req.query.limit);

        // Make filters and user available to all views
        res.locals.filters = req.session.filters;
        res.locals.user = req.user || req.session.user;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).render('error', { 
            message: 'Authentication error', 
            error 
        });
    }
}; 