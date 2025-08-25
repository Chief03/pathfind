'use strict';

(function() {
    let currentCategory = 'all';
    let currentView = 'list';
    let placesData = [];
    let map = null;
    let markers = [];
    let currentCity = '';
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlaces);
    } else {
        initPlaces();
    }
    
    function initPlaces() {
        console.log('[Places] Initializing...');
        
        // Get trip data
        const tripData = JSON.parse(localStorage.getItem('currentTrip') || '{}');
        console.log('[Places] Trip data:', tripData);
        
        // Get destination from the correct property
        currentCity = tripData.destination || tripData.location || 'New York';
        
        // Extract city name if it includes country
        if (currentCity.includes(',')) {
            currentCity = currentCity.split(',')[0].trim();
        }
        
        console.log('[Places] Using city:', currentCity);
        
        // Update city name in header
        const cityNameEl = document.getElementById('places-city-name');
        if (cityNameEl) {
            cityNameEl.textContent = currentCity;
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Load initial places
        loadPlaces();
    }
    
    function setupEventListeners() {
        // Category chips
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                // Update active state
                document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Load places for category
                currentCategory = e.currentTarget.dataset.category;
                loadPlaces();
            });
        });
        
        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                if (view === currentView) return;
                
                // Update active state
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Toggle view
                currentView = view;
                toggleView();
            });
        });
        
        // Search
        const searchBtn = document.getElementById('search-places-btn');
        const searchInput = document.getElementById('place-search');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', performSearch);
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        }
    }
    
    function toggleView() {
        const mapEl = document.getElementById('places-map');
        const listEl = document.getElementById('places-list');
        
        if (currentView === 'map') {
            mapEl.classList.remove('hidden');
            listEl.classList.add('hidden');
            
            // Initialize map if not already done
            if (!map) {
                initializeMap();
            }
            
            // Add markers for current places
            addMarkersToMap();
        } else {
            mapEl.classList.add('hidden');
            listEl.classList.remove('hidden');
        }
    }
    
    function initializeMap() {
        const mapEl = document.getElementById('places-map');
        if (!mapEl) return;
        
        // Default coordinates (will be updated based on city)
        const coords = getCityCoordinates(currentCity);
        
        // Initialize Leaflet map
        map = L.map('places-map').setView(coords, 13);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }
    
    function getCityCoordinates(city) {
        // Normalize city name for matching
        const normalizedCity = city.toLowerCase().trim();
        
        // Comprehensive city coordinates
        const cityCoords = {
            // Original cities
            'paris': [48.8566, 2.3522],
            'london': [51.5074, -0.1278],
            'new york': [40.7128, -74.0060],
            'tokyo': [35.6762, 139.6503],
            'barcelona': [41.3851, 2.1734],
            'rome': [41.9028, 12.4964],
            'amsterdam': [52.3676, 4.9041],
            'berlin': [52.5200, 13.4050],
            'madrid': [40.4168, -3.7038],
            'vienna': [48.2082, 16.3738],
            
            // US Cities
            'colorado': [39.5501, -105.7821], // Colorado state center
            'denver': [39.7392, -104.9903],
            'colorado springs': [38.8339, -104.8214],
            'boulder': [40.0150, -105.2705],
            'aspen': [39.1911, -106.8175],
            'houston': [29.7604, -95.3698],
            'houston tx': [29.7604, -95.3698],
            'austin': [30.2672, -97.7431],
            'dallas': [32.7767, -96.7970],
            'san antonio': [29.4241, -98.4936],
            'los angeles': [34.0522, -118.2437],
            'san francisco': [37.7749, -122.4194],
            'chicago': [41.8781, -87.6298],
            'miami': [25.7617, -80.1918],
            'seattle': [47.6062, -122.3321],
            'boston': [42.3601, -71.0589],
            'las vegas': [36.1699, -115.1398],
            'phoenix': [33.4484, -112.0740],
            'atlanta': [33.7490, -84.3880],
            'nashville': [36.1627, -86.7816],
            
            // International destinations
            'bali': [-8.3405, 115.0920],
            'denpasar': [-8.6500, 115.2167],
            'ubud': [-8.5069, 115.2625],
            'seminyak': [-8.6916, 115.1686],
            'canggu': [-8.6478, 115.1385],
            
            // Africa
            'nigeria': [9.0820, 8.6753], // Nigeria center
            'lagos': [6.5244, 3.3792],
            'abuja': [9.0765, 7.3986],
            'port harcourt': [4.8156, 7.0498],
            'cairo': [30.0444, 31.2357],
            'johannesburg': [-26.2041, 28.0473],
            'cape town': [-33.9249, 18.4241],
            'nairobi': [-1.2921, 36.8219],
            'marrakech': [31.6295, -7.9811],
            'casablanca': [33.5731, -7.5898],
            
            // Asia
            'singapore': [1.3521, 103.8198],
            'bangkok': [13.7563, 100.5018],
            'hong kong': [22.3193, 114.1694],
            'shanghai': [31.2304, 121.4737],
            'beijing': [39.9042, 116.4074],
            'seoul': [37.5665, 126.9780],
            'mumbai': [19.0760, 72.8777],
            'delhi': [28.6139, 77.2090],
            'dubai': [25.2048, 55.2708],
            
            // Europe
            'lisbon': [38.7223, -9.1393],
            'prague': [50.0755, 14.4378],
            'budapest': [47.4979, 19.0402],
            'copenhagen': [55.6761, 12.5683],
            'stockholm': [59.3293, 18.0686],
            'oslo': [59.9139, 10.7522],
            'athens': [37.9838, 23.7275],
            'istanbul': [41.0082, 28.9784],
            
            // South America
            'rio de janeiro': [-22.9068, -43.1729],
            'são paulo': [-23.5505, -46.6333],
            'buenos aires': [-34.6037, -58.3816],
            'lima': [-12.0464, -77.0428],
            'bogotá': [4.7110, -74.0721],
            'santiago': [-33.4489, -70.6693],
            
            // Oceania
            'sydney': [-33.8688, 151.2093],
            'melbourne': [-37.8136, 144.9631],
            'auckland': [-36.8485, 174.7633],
            'queenstown': [-45.0312, 168.6626]
        };
        
        // Try to find exact match
        if (cityCoords[normalizedCity]) {
            return cityCoords[normalizedCity];
        }
        
        // Try to find partial match
        for (const [cityName, coords] of Object.entries(cityCoords)) {
            if (normalizedCity.includes(cityName) || cityName.includes(normalizedCity)) {
                return coords;
            }
        }
        
        // Default to New York if not found
        console.log(`[Places] City "${city}" not found in database, defaulting to New York`);
        return cityCoords['new york'];
    }
    
    function addMarkersToMap() {
        if (!map) return;
        
        // Clear existing markers
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        
        // Add markers for each place
        placesData.forEach(place => {
            if (place.coordinates) {
                const marker = L.marker([place.coordinates.lat, place.coordinates.lng])
                    .addTo(map)
                    .bindPopup(`
                        <div style="padding: 8px;">
                            <h4 style="margin: 0 0 8px 0;">${place.name}</h4>
                            <p style="margin: 0; color: #666; font-size: 14px;">${place.category}</p>
                            ${place.rating ? `<p style="margin: 4px 0; color: #fbbc04;">★ ${place.rating}</p>` : ''}
                        </div>
                    `);
                markers.push(marker);
            }
        });
        
        // Adjust map view to show all markers
        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }
    
    async function loadPlaces() {
        const listEl = document.getElementById('places-list');
        if (!listEl) return;
        
        // Show loading state
        listEl.innerHTML = `
            <div class="places-loading">
                <div class="spinner"></div>
                <p>Discovering ${currentCategory === 'all' ? 'places' : currentCategory} in ${currentCity}...</p>
            </div>
        `;
        
        try {
            // Simulate API call with mock data
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Generate mock places based on category
            placesData = generateMockPlaces(currentCategory);
            
            // Render places
            renderPlaces();
            
            // Update map if in map view
            if (currentView === 'map') {
                addMarkersToMap();
            }
        } catch (error) {
            console.error('[Places] Error loading places:', error);
            listEl.innerHTML = `
                <div class="places-empty">
                    <div class="places-empty-icon">😕</div>
                    <h3>Couldn't load places</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }
    
    function getLocationSpecificPlaces(city) {
        const normalizedCity = city.toLowerCase();
        
        // Location-specific places database
        const cityPlaces = {
            'houston': {
                restaurants: [
                    { name: 'Pappadeaux Seafood Kitchen', description: 'Famous Houston seafood chain', rating: 4.6, price: '$$$' },
                    { name: 'The Breakfast Klub', description: 'Soul food and breakfast classics', rating: 4.7, price: '$$' },
                    { name: 'Xochi', description: 'Oaxacan cuisine in downtown Houston', rating: 4.8, price: '$$$' },
                    { name: 'Ninfa\'s on Navigation', description: 'Original home of the fajita', rating: 4.5, price: '$$' },
                    { name: 'Hugo\'s', description: 'Authentic regional Mexican cuisine', rating: 4.6, price: '$$$' }
                ],
                attractions: [
                    { name: 'Space Center Houston', description: 'NASA\'s official visitor center', rating: 4.7, price: '$$' },
                    { name: 'Houston Museum District', description: '19 museums in a walkable area', rating: 4.8, price: '$' },
                    { name: 'Houston Zoo', description: '6,000+ animals on 55 acres', rating: 4.5, price: '$$' },
                    { name: 'Buffalo Bayou Park', description: '160-acre green space', rating: 4.6, price: 'Free' },
                    { name: 'The Galleria', description: 'Texas\' largest shopping center', rating: 4.4, price: 'Free' }
                ]
            },
            'colorado': {
                restaurants: [
                    { name: 'The Fort Restaurant', description: 'Historic Colorado cuisine', rating: 4.5, price: '$$$' },
                    { name: 'Snooze AM Eatery', description: 'Creative breakfast and brunch', rating: 4.6, price: '$$' },
                    { name: 'Casa Bonita', description: 'Mexican restaurant and entertainment', rating: 4.2, price: '$$' },
                    { name: 'Denver Biscuit Company', description: 'Giant biscuit sandwiches', rating: 4.7, price: '$$' },
                    { name: 'The Buckhorn Exchange', description: 'Colorado\'s oldest restaurant', rating: 4.4, price: '$$$' }
                ],
                attractions: [
                    { name: 'Rocky Mountain National Park', description: 'Stunning mountain landscapes', rating: 4.9, price: '$' },
                    { name: 'Red Rocks Amphitheatre', description: 'Iconic outdoor concert venue', rating: 4.8, price: '$' },
                    { name: 'Garden of the Gods', description: 'Dramatic red rock formations', rating: 4.8, price: 'Free' },
                    { name: 'Pikes Peak', description: 'America\'s Mountain', rating: 4.7, price: '$$' },
                    { name: 'Denver Botanic Gardens', description: '24 acres of themed gardens', rating: 4.6, price: '$' }
                ]
            },
            'bali': {
                restaurants: [
                    { name: 'Locavore', description: 'Award-winning Indonesian-European fusion', rating: 4.8, price: '$$$' },
                    { name: 'Warung Babi Guling Ibu Oka', description: 'Famous Balinese suckling pig', rating: 4.6, price: '$' },
                    { name: 'La Lucciola', description: 'Beachfront Italian dining', rating: 4.5, price: '$$$' },
                    { name: 'Bebek Bengil', description: 'Crispy duck in Ubud', rating: 4.4, price: '$$' },
                    { name: 'Sardine', description: 'Fresh seafood in rice paddies', rating: 4.7, price: '$$$' }
                ],
                attractions: [
                    { name: 'Tanah Lot Temple', description: 'Iconic sea temple', rating: 4.6, price: '$' },
                    { name: 'Tegallalang Rice Terraces', description: 'Stunning terraced landscapes', rating: 4.7, price: '$' },
                    { name: 'Sacred Monkey Forest', description: 'Nature reserve and temple complex', rating: 4.5, price: '$' },
                    { name: 'Uluwatu Temple', description: 'Clifftop temple with ocean views', rating: 4.8, price: '$' },
                    { name: 'Mount Batur', description: 'Active volcano for sunrise hikes', rating: 4.7, price: '$$' }
                ]
            },
            'nigeria': {
                restaurants: [
                    { name: 'Yellow Chilli', description: 'Modern Nigerian cuisine', rating: 4.5, price: '$$' },
                    { name: 'Nkoyo', description: 'Traditional Nigerian dishes', rating: 4.6, price: '$$' },
                    { name: 'Terra Kulture', description: 'Cultural center with restaurant', rating: 4.4, price: '$$' },
                    { name: 'The Jollof Pot', description: 'Authentic West African cuisine', rating: 4.3, price: '$' },
                    { name: 'Sky Restaurant & Bar', description: 'Rooftop dining in Lagos', rating: 4.5, price: '$$$' }
                ],
                attractions: [
                    { name: 'Nike Art Gallery', description: 'Largest art gallery in West Africa', rating: 4.7, price: 'Free' },
                    { name: 'Lekki Conservation Centre', description: 'Nature reserve with canopy walk', rating: 4.5, price: '$' },
                    { name: 'National Museum Lagos', description: 'Nigerian art and history', rating: 4.3, price: '$' },
                    { name: 'Olumo Rock', description: 'Historic rock formation in Abeokuta', rating: 4.6, price: '$' },
                    { name: 'Yankari National Park', description: 'Wildlife and hot springs', rating: 4.4, price: '$$' }
                ]
            }
        };
        
        // Check for exact city match
        if (cityPlaces[normalizedCity]) {
            return cityPlaces[normalizedCity];
        }
        
        // Check for partial matches
        for (const [cityName, places] of Object.entries(cityPlaces)) {
            if (normalizedCity.includes(cityName) || cityName.includes(normalizedCity)) {
                return places;
            }
        }
        
        // Return null to use default templates
        return null;
    }
    
    function generateMockPlaces(category) {
        const baseCoords = getCityCoordinates(currentCity);
        const places = [];
        
        // Get location-specific templates based on current city
        const placeTemplates = getLocationSpecificPlaces(currentCity);
        
        // If no specific places found, use generic templates
        const defaultTemplates = {
            restaurants: [
                { name: `${currentCity} Bistro`, description: `Popular local restaurant in ${currentCity}`, rating: 4.5, price: '$$' },
                { name: `Downtown ${currentCity} Grill`, description: `Traditional dishes from ${currentCity} region`, rating: 4.7, price: '$$$' },
                { name: `${currentCity} Seafood House`, description: `Fresh seafood in the heart of ${currentCity}`, rating: 4.6, price: '$$$' },
                { name: `The ${currentCity} Table`, description: `Farm-to-table dining in ${currentCity}`, rating: 4.4, price: '$$' },
                { name: `${currentCity} Spice Kitchen`, description: `International cuisine in ${currentCity}`, rating: 4.3, price: '$$' }
            ],
            attractions: [
                { name: `${currentCity} History Museum`, description: `Discover the rich history of ${currentCity}`, rating: 4.5, price: '$' },
                { name: `${currentCity} Observation Tower`, description: `Panoramic views of ${currentCity} skyline`, rating: 4.8, price: '$$' },
                { name: `${currentCity} Art Museum`, description: `Local and international art in ${currentCity}`, rating: 4.6, price: '$' },
                { name: `${currentCity} Botanical Gardens`, description: `Beautiful gardens in ${currentCity}`, rating: 4.7, price: '$' },
                { name: `Old ${currentCity}`, description: `Historic district of ${currentCity}`, rating: 4.9, price: 'Free' }
            ],
            hotels: [
                { name: `${currentCity} Grand Hotel`, description: `Luxury accommodation in ${currentCity} center`, rating: 4.6, price: '$$$$' },
                { name: `${currentCity} Boutique Inn`, description: `Charming boutique hotel in ${currentCity}`, rating: 4.5, price: '$$$' },
                { name: `${currentCity} Backpackers`, description: `Budget-friendly hostel in ${currentCity}`, rating: 4.2, price: '$' },
                { name: `${currentCity} Business Suites`, description: `Modern business hotel in ${currentCity}`, rating: 4.4, price: '$$$' },
                { name: `${currentCity} Resort & Spa`, description: `Luxury resort near ${currentCity}`, rating: 4.7, price: '$$$$' }
            ],
            cafes: [
                { name: 'Morning Brew', description: 'Artisan coffee and fresh pastries', rating: 4.6, price: '$' },
                { name: 'The Cozy Corner', description: 'Perfect spot for afternoon tea', rating: 4.5, price: '$' },
                { name: 'Espresso Express', description: 'Quick coffee for busy travelers', rating: 4.3, price: '$' },
                { name: 'Book & Bean', description: 'Coffee shop with reading nook', rating: 4.7, price: '$' },
                { name: 'Sunset Café', description: 'Rooftop café with city views', rating: 4.8, price: '$$' }
            ],
            shopping: [
                { name: 'Central Market', description: 'Local crafts and souvenirs', rating: 4.4, price: '$$' },
                { name: 'Fashion District', description: 'Designer boutiques and brands', rating: 4.5, price: '$$$' },
                { name: 'Antique Row', description: 'Vintage finds and collectibles', rating: 4.3, price: '$$' },
                { name: 'Mall Plaza', description: 'Modern shopping center', rating: 4.2, price: '$$' },
                { name: 'Artisan Quarter', description: 'Handmade goods from local artists', rating: 4.6, price: '$$' }
            ],
            nightlife: [
                { name: 'Jazz Club', description: 'Live music in an intimate setting', rating: 4.7, price: '$$' },
                { name: 'Rooftop Bar', description: 'Cocktails with stunning city views', rating: 4.6, price: '$$$' },
                { name: 'Dance Palace', description: 'Popular nightclub with DJ sets', rating: 4.3, price: '$$' },
                { name: 'Wine Bar', description: 'Extensive wine selection and tapas', rating: 4.5, price: '$$' },
                { name: 'Comedy Club', description: 'Stand-up shows and entertainment', rating: 4.4, price: '$$' }
            ],
            parks: [
                { name: 'Central Park', description: 'Large green space perfect for picnics', rating: 4.8, price: 'Free' },
                { name: 'Riverside Walk', description: 'Scenic path along the water', rating: 4.6, price: 'Free' },
                { name: 'Memorial Gardens', description: 'Peaceful gardens with monuments', rating: 4.5, price: 'Free' },
                { name: 'Adventure Park', description: 'Outdoor activities and trails', rating: 4.4, price: '$' },
                { name: 'Japanese Garden', description: 'Tranquil space with traditional design', rating: 4.7, price: '$' }
            ]
        };
        
        // Use location-specific templates or fall back to defaults
        const templates = placeTemplates || defaultTemplates;
        
        // Select templates based on category
        let selectedTemplates = [];
        if (category === 'all') {
            // Mix from all categories
            Object.values(templates).forEach(categoryTemplates => {
                selectedTemplates.push(...categoryTemplates.slice(0, 2));
            });
        } else {
            selectedTemplates = templates[category] || [];
        }
        
        // Create place objects with coordinates
        selectedTemplates.forEach((template, index) => {
            places.push({
                id: `place-${Date.now()}-${index}`,
                ...template,
                category: category === 'all' ? detectCategory(template.name) : category,
                distance: `${(Math.random() * 5 + 0.5).toFixed(1)} km`,
                coordinates: {
                    lat: baseCoords[0] + (Math.random() - 0.5) * 0.05,
                    lng: baseCoords[1] + (Math.random() - 0.5) * 0.05
                },
                image: null // Could add image URLs here
            });
        });
        
        return places;
    }
    
    function detectCategory(name) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('restaurant') || nameLower.includes('bistro') || nameLower.includes('trattoria')) return 'restaurants';
        if (nameLower.includes('hotel') || nameLower.includes('inn') || nameLower.includes('hostel')) return 'hotels';
        if (nameLower.includes('café') || nameLower.includes('coffee') || nameLower.includes('brew')) return 'cafes';
        if (nameLower.includes('museum') || nameLower.includes('gallery') || nameLower.includes('tower')) return 'attractions';
        if (nameLower.includes('park') || nameLower.includes('garden')) return 'parks';
        if (nameLower.includes('bar') || nameLower.includes('club')) return 'nightlife';
        if (nameLower.includes('shop') || nameLower.includes('market')) return 'shopping';
        return 'attractions';
    }
    
    function renderPlaces() {
        const listEl = document.getElementById('places-list');
        if (!listEl) return;
        
        if (placesData.length === 0) {
            listEl.innerHTML = `
                <div class="places-empty">
                    <div class="places-empty-icon">🔍</div>
                    <h3>No places found</h3>
                    <p>Try a different category or search term</p>
                </div>
            `;
            return;
        }
        
        listEl.innerHTML = '';
        
        placesData.forEach(place => {
            const placeCard = createPlaceCard(place);
            listEl.appendChild(placeCard);
        });
    }
    
    function createPlaceCard(place) {
        const card = document.createElement('div');
        card.className = 'place-card';
        
        const categoryEmoji = getCategoryEmoji(place.category);
        
        card.innerHTML = `
            ${place.image ? 
                `<img src="${place.image}" alt="${place.name}" class="place-image">` :
                `<div class="place-image placeholder">${categoryEmoji}</div>`
            }
            <div class="place-content">
                <div class="place-header">
                    <h4 class="place-name">${place.name}</h4>
                    ${place.rating ? `
                        <div class="place-rating">
                            <span class="stars">★</span>
                            <span>${place.rating}</span>
                        </div>
                    ` : ''}
                </div>
                <span class="place-category">${formatCategory(place.category)}</span>
                <p class="place-description">${place.description}</p>
                <div class="place-footer">
                    <div class="place-info">
                        <span class="place-distance">📍 ${place.distance}</span>
                        ${place.price ? `<span class="place-price">${place.price}</span>` : ''}
                    </div>
                    <div class="place-actions">
                        <button class="place-action-btn" onclick="window.places.addToItinerary('${place.id}')">
                            Add to Trip
                        </button>
                        <button class="place-action-btn primary" onclick="window.places.viewDetails('${place.id}')">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }
    
    function getCategoryEmoji(category) {
        const emojis = {
            restaurants: '🍽️',
            attractions: '🏛️',
            hotels: '🏨',
            cafes: '☕',
            shopping: '🛍️',
            nightlife: '🌃',
            parks: '🌳'
        };
        return emojis[category] || '📍';
    }
    
    function formatCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
    
    function performSearch() {
        const searchInput = document.getElementById('place-search');
        const query = searchInput.value.trim();
        
        if (!query) {
            loadPlaces();
            return;
        }
        
        // Filter places based on search query
        const filtered = placesData.filter(place => 
            place.name.toLowerCase().includes(query.toLowerCase()) ||
            place.description.toLowerCase().includes(query.toLowerCase())
        );
        
        placesData = filtered;
        renderPlaces();
        
        if (currentView === 'map') {
            addMarkersToMap();
        }
    }
    
    // Public API
    window.places = {
        addToItinerary: function(placeId) {
            const place = placesData.find(p => p.id === placeId);
            if (!place) return;
            
            // Add to itinerary using the itinerary cards system
            if (window.itineraryCards && typeof window.itineraryCards.addCard === 'function') {
                const tripData = JSON.parse(localStorage.getItem('currentTrip') || '{}');
                
                const itineraryItem = {
                    location: place.name,
                    date: tripData.startDate || new Date().toISOString().split('T')[0],
                    time: '14:00',
                    price: 0,
                    description: place.description,
                    category: 'Place to Visit'
                };
                
                window.itineraryCards.addCard(itineraryItem);
                
                // Show success message
                alert(`Added "${place.name}" to your itinerary!`);
            }
        },
        
        viewDetails: function(placeId) {
            const place = placesData.find(p => p.id === placeId);
            if (!place) return;
            
            // In a real app, this would open a detailed view
            alert(`${place.name}\n\n${place.description}\n\nRating: ${place.rating || 'N/A'}\nDistance: ${place.distance}\nPrice: ${place.price || 'Free'}`);
        }
    };
})();