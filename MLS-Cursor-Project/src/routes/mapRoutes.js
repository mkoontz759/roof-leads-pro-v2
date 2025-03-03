router.get('/map', auth.protect, async (req, res) => {
    try {
        // Get all listings that have coordinates
        const listings = await Listing.find({
            'address.lat': { $exists: true },
            'address.lng': { $exists: true }
        }).lean();

        console.log(`Found ${listings.length} listings with coordinates`); // Debug log

        // Calculate map center from listings or default to Lubbock
        const mapCenter = listings.length > 0 
            ? {
                lat: listings.reduce((sum, l) => sum + l.address.lat, 0) / listings.length,
                lng: listings.reduce((sum, l) => sum + l.address.lng, 0) / listings.length
              }
            : { lat: 33.5779, lng: -101.8552 }; // Lubbock center

        res.render('map', {
            listings: listings,
            mapCenter: mapCenter,
            mapboxToken: process.env.MAPBOX_ACCESS_TOKEN
        });
    } catch (error) {
        console.error('Map view error:', error);
        res.status(500).render('error', { message: 'Error loading map view' });
    }
});

// API endpoint for map data
router.get('/api/map-data', auth.protect, async (req, res) => {
    try {
        const listings = await Listing.find({
            isActive: true,
            'address.lat': { $exists: true },
            'address.lng': { $exists: true }
        }).lean();

        // Transform data for map display
        const mapData = listings.map(listing => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [listing.address.lng, listing.address.lat]
            },
            properties: {
                listingKey: listing.listingKey,
                address: listing.address.street,
                price: listing.listPrice,
                status: listing.status,
                bedrooms: listing.bedrooms,
                bathrooms: listing.bathrooms,
                squareFootage: listing.squareFootage
            }
        }));

        res.json({
            type: 'FeatureCollection',
            features: mapData
        });
    } catch (error) {
        console.error('Map data error:', error);
        res.status(500).json({ error: 'Error fetching map data' });
    }
}); 