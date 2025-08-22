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
        currentCity = tripData.destination || tripData.destinationCity || 'Paris';
        
        // Extract city name if it includes country
        if (currentCity.includes(',')) {
            currentCity = currentCity.split(',')[0].trim();
        }
        
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
        // Basic city coordinates (expand as needed)
        const cityCoords = {
            'Paris': [48.8566, 2.3522],
            'London': [51.5074, -0.1278],
            'New York': [40.7128, -74.0060],
            'Tokyo': [35.6762, 139.6503],
            'Barcelona': [41.3851, 2.1734],
            'Rome': [41.9028, 12.4964],
            'Amsterdam': [52.3676, 4.9041],
            'Berlin': [52.5200, 13.4050],
            'Madrid': [40.4168, -3.7038],
            'Vienna': [48.2082, 16.3738]
        };
        
        // Return coordinates or default to Paris
        return cityCoords[city] || cityCoords['Paris'];
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
    
    function generateMockPlaces(category) {
        const baseCoords = getCityCoordinates(currentCity);
        const places = [];
        
        const placeTemplates = {
            restaurants: [
                { name: 'Le Petit Bistro', description: 'Cozy French restaurant with authentic cuisine', rating: 4.5, price: '$$' },
                { name: 'Trattoria Bella', description: 'Traditional Italian dishes in a warm atmosphere', rating: 4.7, price: '$$$' },
                { name: 'Sushi Master', description: 'Fresh sushi and Japanese specialties', rating: 4.6, price: '$$$' },
                { name: 'The Garden Table', description: 'Farm-to-table dining experience', rating: 4.4, price: '$$' },
                { name: 'Spice Route', description: 'Exotic flavors from around the world', rating: 4.3, price: '$$' }
            ],
            attractions: [
                { name: 'Historic Museum', description: 'Journey through centuries of local history', rating: 4.5, price: '$' },
                { name: 'City Tower', description: 'Panoramic views from the observation deck', rating: 4.8, price: '$$' },
                { name: 'Art Gallery', description: 'Contemporary and classical art exhibitions', rating: 4.6, price: '$' },
                { name: 'Botanical Gardens', description: 'Beautiful gardens with rare plant species', rating: 4.7, price: '$' },
                { name: 'Old Town Square', description: 'Historic center with charming architecture', rating: 4.9, price: 'Free' }
            ],
            hotels: [
                { name: 'Grand Plaza Hotel', description: 'Luxury accommodation in the city center', rating: 4.6, price: '$$$$' },
                { name: 'Boutique Inn', description: 'Charming boutique hotel with personalized service', rating: 4.5, price: '$$$' },
                { name: 'City Hostel', description: 'Budget-friendly accommodation for travelers', rating: 4.2, price: '$' },
                { name: 'Business Suites', description: 'Modern amenities for business travelers', rating: 4.4, price: '$$$' },
                { name: 'Riverside Resort', description: 'Peaceful retreat by the water', rating: 4.7, price: '$$$$' }
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
        
        // Select templates based on category
        let selectedTemplates = [];
        if (category === 'all') {
            // Mix from all categories
            Object.values(placeTemplates).forEach(templates => {
                selectedTemplates.push(...templates.slice(0, 2));
            });
        } else {
            selectedTemplates = placeTemplates[category] || [];
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