// Debug logs
console.log('Mapbox Token:', mapboxToken);
console.log('Map Center:', mapCenter);

// Initialize variables
let map;
let draw;
let markers = new Map(); // Using Map to store marker references
let selectedMarker = null;
let visitedMarkers = new Set();
let currentPopup = null;

async function initializeMap() {
    try {
        // Initialize map
        mapboxgl.accessToken = mapboxToken;
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [mapCenter.lng, mapCenter.lat],
            zoom: 11
        });

        // Add controls
        map.addControl(new mapboxgl.NavigationControl());

        // Initialize draw control
        draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                trash: true
            }
        });
        map.addControl(draw);

        // Add event listeners
        setupEventListeners();

        // Load markers when map is ready
        map.on('load', loadMarkers);
    } catch (error) {
        console.error('Map initialization error:', error);
    }
}

function setupEventListeners() {
    // Drawing tools
    document.getElementById('draw-polygon').addEventListener('click', () => {
        draw.changeMode('draw_polygon');
    });

    document.getElementById('clear-polygon').addEventListener('click', () => {
        draw.deleteAll();
        document.getElementById('clear-polygon').disabled = true;
        showAllMarkers();
        clearListingsList();
    });

    // Filters
    const filters = ['dateFilter', 'priceFilter'];
    filters.forEach(filter => {
        document.getElementById(filter).addEventListener('change', () => {
            loadMarkers();
        });
    });

    // Map events
    map.on('draw.create', updateAreaSearch);
    map.on('draw.delete', updateAreaSearch);
    map.on('draw.update', updateAreaSearch);
}

async function loadMarkers() {
    try {
        // Build query parameters
        const dateFilter = document.getElementById('dateFilter').value;
        const priceFilter = document.getElementById('priceFilter').value;
        const queryParams = new URLSearchParams({ dateFilter, priceFilter });

        const response = await fetch(`/api/map-data?${queryParams}`);
        const listings = await response.json();

        // Clear existing markers
        markers.forEach(marker => marker.remove());
        markers.clear();

        // Add new markers
        listings.forEach(listing => {
            if (listing.address?.lat && listing.address?.lng) {
                // Create marker element
                const el = document.createElement('div');
                el.className = 'marker marker-default';

                // Create marker
                const marker = new mapboxgl.Marker({
                    element: el,
                    anchor: 'bottom'
                })
                .setLngLat([listing.address.lng, listing.address.lat])
                .addTo(map);

                // Create popup
                const popup = createPopup(listing);

                // Add click event
                el.addEventListener('click', () => {
                    handleMarkerClick(marker, popup, listing);
                });

                markers.set(listing.mlsNumber, { marker, listing, popup });
            }
        });
    } catch (error) {
        console.error('Error loading markers:', error);
    }
}

function createPopup(listing) {
    const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(listing.listPrice);

    const popupContent = `
        <div class="popup-content">
            <div class="popup-price">${formattedPrice}</div>
            <div class="popup-details">
                <p>${listing.bedrooms} beds • ${listing.bathrooms} baths • ${listing.squareFootage.toLocaleString()} sqft</p>
                <p>${listing.address.street}</p>
                <p>${listing.address.city}, ${listing.address.state} ${listing.address.zip}</p>
            </div>
        </div>
    `;

    return new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false
    }).setHTML(popupContent);
}

function handleMarkerClick(marker, popup, listing) {
    // Remove previous popup
    if (currentPopup) currentPopup.remove();

    // Handle marker states
    if (selectedMarker) {
        const prevEl = selectedMarker.getElement();
        prevEl.className = 'marker marker-default';
        visitedMarkers.add(selectedMarker);
    }

    // Update selected marker
    const el = marker.getElement();
    el.className = 'marker marker-selected';
    selectedMarker = marker;

    // Show popup
    popup.addTo(map);
    currentPopup = popup;

    // Show listing details
    showListingDetails(listing);
}

function showListingDetails(listing) {
    const detailsContainer = document.getElementById('selected-listing');
    detailsContainer.style.display = 'block';

    const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(listing.listPrice);

    detailsContainer.innerHTML = `
        <div class="listing-card">
            <div class="listing-price">${formattedPrice}</div>
            <div class="listing-address">
                ${listing.address.street}<br>
                ${listing.address.city}, ${listing.address.state} ${listing.address.zip}
            </div>
            <div class="listing-details">
                <span>${listing.bedrooms} beds</span> • 
                <span>${listing.bathrooms} baths</span> • 
                <span>${listing.squareFootage.toLocaleString()} sqft</span>
            </div>
            <div class="agent-info">
                <h4>Listed by:</h4>
                <p>${listing.agent.name.full}</p>
                <p>${listing.agent.officeName}</p>
                <p>
                    <a href="tel:${listing.agent.phone}">${listing.agent.phone}</a><br>
                    <a href="mailto:${listing.agent.email}">${listing.agent.email}</a>
                </p>
            </div>
            <div class="listing-meta">
                <p>MLS#: ${listing.mlsNumber}</p>
            </div>
        </div>
    `;
}

function updateAreaSearch(e) {
    const data = draw.getAll();
    const clearButton = document.getElementById('clear-polygon');
    clearButton.disabled = data.features.length === 0;

    if (data.features.length > 0) {
        const polygon = data.features[0].geometry.coordinates[0];
        const listingsInArea = filterListingsByPolygon(polygon);
        updateListingsList(listingsInArea);
    }
}

function filterListingsByPolygon(polygon) {
    const listingsInArea = [];
    markers.forEach(({ marker, listing }) => {
        const point = marker.getLngLat();
        if (pointInPolygon(point, polygon)) {
            listingsInArea.push(listing);
            marker.getElement().style.display = 'block';
        } else {
            marker.getElement().style.display = 'none';
        }
    });
    return listingsInArea;
}

function updateListingsList(listings) {
    const listContainer = document.getElementById('listings-list');
    listContainer.innerHTML = listings.map(listing => `
        <div class="listing-item" onclick="focusListing('${listing.mlsNumber}')">
            <div class="listing-price">${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
            }).format(listing.listPrice)}</div>
            <div class="listing-address">${listing.address.street}</div>
            <div class="listing-details">
                ${listing.bedrooms} beds • ${listing.bathrooms} baths • 
                ${listing.squareFootage.toLocaleString()} sqft
            </div>
        </div>
    `).join('');
}

function focusListing(mlsNumber) {
    const markerData = markers.get(mlsNumber);
    if (markerData) {
        const { marker, popup, listing } = markerData;
        handleMarkerClick(marker, popup, listing);

        map.flyTo({
            center: marker.getLngLat(),
            zoom: 15
        });
    }
}

// Helper functions
function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];

        const intersect = ((yi > point.lat) !== (yj > point.lat))
            && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function showAllMarkers() {
    markers.forEach(({ marker }) => {
        marker.getElement().style.display = 'block';
    });
}

function clearListingsList() {
    const listContainer = document.getElementById('listings-list');
    if (listContainer) listContainer.innerHTML = '';
}

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', initializeMap);

// Add search functionality
const searchInput = document.getElementById('address-search');
searchInput.addEventListener('input', debounce(async (e) => {
    const query = e.target.value;
    if (query.length < 3) return;

    try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=US`
        );
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            map.flyTo({
                center: [lng, lat],
                zoom: 13
            });
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}, 500));

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}