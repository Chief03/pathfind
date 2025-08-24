let socket;
let currentTrip = null;
let currentUser = {
    id: generateUserId(),
    name: ''
};
let map;
let markers = [];
let destinations = [];
let itinerary = [];
let budget = {
    accommodation: 0,
    transportation: 0,
    food: 0,
    activities: 0,
    other: 0
};
let searchTimeout = null;

function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeEventListeners();
        initializeLocationAutocomplete();
        
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

function initializeEventListeners() {
    // Only add event listeners if elements exist
    const createTripBtn = document.getElementById('create-trip-btn');
    if (createTripBtn) createTripBtn.addEventListener('click', showCreateForm);
    
    const createBtn = document.getElementById('create-btn');
    if (createBtn) createBtn.addEventListener('click', createNewTrip);
    
    const joinTripBtn = document.getElementById('join-trip-btn');
    if (joinTripBtn) joinTripBtn.addEventListener('click', showJoinForm);
    
    const joinBtn = document.getElementById('join-btn');
    if (joinBtn) joinBtn.addEventListener('click', joinTrip);
    
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) shareBtn.addEventListener('click', showShareModal);
    
    const closeModal = document.getElementById('close-modal');
    if (closeModal) closeModal.addEventListener('click', hideShareModal);
    
    const copyCode = document.getElementById('copy-code');
    if (copyCode) copyCode.addEventListener('click', copyTripCode);
    
    const destSearch = document.getElementById('destination-search');
    if (destSearch) {
        destSearch.addEventListener('input', handleDestinationSearch);
        destSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addDestination();
        });
    }
    
    const tripLocation = document.getElementById('trip-location');
    if (tripLocation) tripLocation.addEventListener('input', handleMainLocationSearch);
    
    const addDest = document.getElementById('add-destination');
    if (addDest) addDest.addEventListener('click', addDestination);
    
    const sendMsg = document.getElementById('send-message');
    if (sendMsg) sendMsg.addEventListener('click', sendChatMessage);
    
    const chatInput = document.getElementById('chat-input');
    if (chatInput) chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    const addDayBtn = document.getElementById('add-day-btn');
    if (addDayBtn) addDayBtn.addEventListener('click', addItineraryDay);
    
    document.querySelectorAll('.tab').forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                console.log('[App] Switching to tab:', tabName);
                if (tabName) {
                    switchTab(tabName);
                }
            });
        }
    });
    
    document.querySelectorAll('.budget-input').forEach(input => {
        input.addEventListener('input', updateBudget);
    });
    
    const zoomIn = document.getElementById('zoom-in');
    if (zoomIn) zoomIn.addEventListener('click', () => {
        if (map) map.zoomIn();
    });
    
    const zoomOut = document.getElementById('zoom-out');
    if (zoomOut) zoomOut.addEventListener('click', () => {
        if (map) map.zoomOut();
    });
    
    const centerMapBtn = document.getElementById('center-map');
    if (centerMapBtn) centerMapBtn.addEventListener('click', centerMap);
}

function showCreateForm() {
    const form = document.getElementById('create-trip-form');
    if (form) {
        form.classList.remove('hidden');
    }
}

async function createNewTrip() {
    const tripName = document.getElementById('trip-name-input').value.trim() || 'My Adventure';
    const tripLocation = document.getElementById('trip-location').value.trim();
    const creatorName = document.getElementById('creator-name').value.trim();
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!tripLocation || !creatorName) {
        alert('Please enter trip location and your name');
        return;
    }
    
    currentUser.name = creatorName;
    
    const locationData = await geocodeLocation(tripLocation);
    
    try {
        const response = await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: tripName,
                location: tripLocation,
                coordinates: locationData,
                startDate: startDate,
                endDate: endDate
            })
        });
        
        const trip = await response.json();
        currentTrip = trip;
        
        connectToTrip(trip.id);
        showTripPlanner();
    } catch (error) {
        console.error('Error creating trip:', error);
        alert('Failed to create trip. Please try again.');
    }
}

function showJoinForm() {
    const form = document.getElementById('join-trip-form');
    if (form) {
        form.classList.remove('hidden');
    }
}

async function joinTrip() {
    const tripCode = document.getElementById('trip-code').value.trim();
    const userName = document.getElementById('user-name').value.trim();
    
    if (!tripCode || !userName) {
        alert('Please enter both trip code and your name');
        return;
    }
    
    currentUser.name = userName;
    
    try {
        const response = await fetch(`/api/trips/${tripCode}`);
        if (response.ok) {
            const trip = await response.json();
            currentTrip = trip;
            connectToTrip(tripCode);
            showTripPlanner();
        } else {
            alert('Trip not found. Please check the code.');
        }
    } catch (error) {
        console.error('Error joining trip:', error);
        alert('Failed to join trip. Please try again.');
    }
}

function connectToTrip(tripId) {
    socket = io();
    
    socket.emit('join-trip', {
        tripId: tripId,
        userId: currentUser.id,
        userName: currentUser.name
    });
    
    socket.on('trip-data', (trip) => {
        currentTrip = trip;
        updateTripDisplay();
    });
    
    socket.on('user-joined', (data) => {
        addNotification(`${data.userName} joined the trip`);
        updateActiveUsers();
    });
    
    socket.on('user-left', (data) => {
        addNotification(`${data.userName} left the trip`);
        updateActiveUsers();
    });
    
    socket.on('destination-updated', (destination) => {
        updateDestinationsList(destination);
        addMapMarker(destination);
    });
    
    socket.on('itinerary-updated', (newItinerary) => {
        itinerary = newItinerary;
        displayItinerary();
    });
    
    socket.on('new-message', (data) => {
        displayChatMessage(data);
    });
}

function showTripPlanner() {
    document.getElementById('landing-page').classList.remove('active');
    document.getElementById('trip-planner').classList.add('active');
    
    document.getElementById('trip-name').textContent = currentTrip.name;
    document.getElementById('trip-code-display').textContent = currentTrip.id;
    
    if (currentTrip.location) {
        document.getElementById('main-location').textContent = currentTrip.location;
    }
    
    if (currentTrip.startDate && currentTrip.endDate) {
        const start = new Date(currentTrip.startDate).toLocaleDateString();
        const end = new Date(currentTrip.endDate).toLocaleDateString();
        document.getElementById('trip-dates-display').textContent = `${start} - ${end}`;
    }
    
    initializeMap();
    updateTripDisplay();
}

function initializeMap() {
    const defaultLat = currentTrip.coordinates?.lat || 40.7128;
    const defaultLng = currentTrip.coordinates?.lng || -74.0060;
    const defaultZoom = currentTrip.coordinates ? 10 : 2;
    
    map = L.map('map').setView([defaultLat, defaultLng], defaultZoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    if (currentTrip.coordinates) {
        L.marker([defaultLat, defaultLng])
            .addTo(map)
            .bindPopup(`<strong>${currentTrip.location}</strong><br>Trip destination`);
    }
}

function updateTripDisplay() {
    if (currentTrip.destinations) {
        currentTrip.destinations.forEach(dest => {
            updateDestinationsList(dest);
            addMapMarker(dest);
        });
    }
    
    if (currentTrip.itinerary) {
        itinerary = currentTrip.itinerary;
        displayItinerary();
    }
}

async function addDestination() {
    const searchInput = document.getElementById('destination-search');
    const destinationName = searchInput.value.trim();
    
    if (!destinationName) return;
    
    const coords = await geocodeLocation(destinationName);
    
    const destination = {
        id: 'dest_' + Date.now(),
        name: destinationName,
        lat: coords?.lat || (currentTrip.coordinates?.lat || 0),
        lng: coords?.lng || (currentTrip.coordinates?.lng || 0),
        addedBy: currentUser.name
    };
    
    destinations.push(destination);
    
    socket.emit('update-destination', {
        tripId: currentTrip.id,
        destination: destination
    });
    
    searchInput.value = '';
    document.getElementById('search-suggestions').classList.add('hidden');
}

function updateDestinationsList(destination) {
    const listContainer = document.getElementById('destinations-list');
    let destElement = document.getElementById(destination.id);
    
    if (!destElement) {
        destElement = document.createElement('div');
        destElement.id = destination.id;
        destElement.className = 'destination-item';
        listContainer.appendChild(destElement);
    }
    
    destElement.innerHTML = `
        <strong>${destination.name}</strong>
        <div style="font-size: 0.9em; color: #666;">Added by ${destination.addedBy}</div>
    `;
}

function addMapMarker(destination) {
    const marker = L.marker([destination.lat, destination.lng])
        .addTo(map)
        .bindPopup(`<strong>${destination.name}</strong><br>Added by ${destination.addedBy}`);
    
    markers.push(marker);
}

function centerMap() {
    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

function switchTab(tabName) {
    console.log('[App] switchTab called with:', tabName);
    
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(btn => {
        if (btn) {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        }
    });
    
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(panel => {
        if (panel) {
            panel.classList.add('hidden');
        }
    });
    
    // Show selected tab
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
        console.log('[App] Switched to tab:', tabName);
        
        // Special handling for flights tab
        if (tabName === 'flights') {
            console.log('[App] Initializing flights tab...');
            // Initialize FlightsPage if not already done
            if (!window.flightsPage) {
                console.log('[App] Creating new FlightsPage instance');
                window.flightsPage = new FlightsPage();
            }
        }
    } else {
        console.error('[App] Target tab not found:', `${tabName}-tab`);
    }
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    socket.emit('chat-message', {
        tripId: currentTrip.id,
        message: message,
        userName: currentUser.name
    });
    
    input.value = '';
}

function displayChatMessage(data) {
    const chatContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const time = new Date(data.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageElement.innerHTML = `
        <div class="sender">${data.userName}<span class="time">${time}</span></div>
        <div>${data.message}</div>
    `;
    
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addItineraryDay() {
    const dayNumber = itinerary.length + 1;
    const newDay = {
        day: dayNumber,
        date: '',
        activities: []
    };
    
    itinerary.push(newDay);
    
    socket.emit('update-itinerary', {
        tripId: currentTrip.id,
        itinerary: itinerary
    });
    
    displayItinerary();
}

function displayItinerary() {
    const container = document.getElementById('itinerary-list');
    container.innerHTML = '';
    
    itinerary.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'itinerary-day';
        
        dayElement.innerHTML = `
            <div class="day-header">Day ${day.day}</div>
            <div class="day-activities">
                <button onclick="addActivity(${day.day - 1})">+ Add Activity</button>
                <div id="activities-day-${day.day}"></div>
            </div>
        `;
        
        container.appendChild(dayElement);
        
        if (day.activities && day.activities.length > 0) {
            const activitiesContainer = dayElement.querySelector(`#activities-day-${day.day}`);
            day.activities.forEach(activity => {
                const activityElement = document.createElement('div');
                activityElement.className = 'activity-item';
                activityElement.innerHTML = `
                    <span>${activity.name}</span>
                    <span class="activity-time">${activity.time || ''}</span>
                `;
                activitiesContainer.appendChild(activityElement);
            });
        }
    });
}

function addActivity(dayIndex) {
    const activityName = prompt('Enter activity:');
    const activityTime = prompt('Enter time (optional):');
    
    if (!activityName) return;
    
    if (!itinerary[dayIndex].activities) {
        itinerary[dayIndex].activities = [];
    }
    
    itinerary[dayIndex].activities.push({
        name: activityName,
        time: activityTime || ''
    });
    
    socket.emit('update-itinerary', {
        tripId: currentTrip.id,
        itinerary: itinerary
    });
    
    displayItinerary();
}

function updateBudget() {
    let total = 0;
    document.querySelectorAll('.budget-input').forEach(input => {
        const value = parseFloat(input.value) || 0;
        budget[input.dataset.category] = value;
        total += value;
    });
    
    document.getElementById('total-budget').textContent = total.toFixed(2);
}

function showShareModal() {
    const shareCode = document.getElementById('share-code');
    const modal = document.getElementById('share-modal');
    
    if (shareCode && currentTrip) {
        shareCode.textContent = currentTrip.id;
    }
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function copyTripCode() {
    const code = currentTrip.id;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copy-code');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

function addNotification(message) {
    console.log('Notification:', message);
}

function updateActiveUsers() {
    
}

window.addActivity = addActivity;

// Helper functions for page navigation
function showSignupPage() {
    if (window.hideAllPages) window.hideAllPages();
    document.getElementById('signup-page').classList.add('active');
}

async function geocodeLocation(location) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
    } catch (error) {
        console.error('Geocoding error:', error);
    }
    return null;
}

async function searchLocations(query) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        return data.map(item => ({
            name: item.display_name.split(',')[0],
            details: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
        }));
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

function handleDestinationSearch(e) {
    const query = e.target.value.trim();
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
        document.getElementById('search-suggestions').classList.add('hidden');
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        const suggestions = await searchLocations(query);
        displaySuggestions(suggestions, 'destination');
    }, 300);
}

function handleMainLocationSearch(e) {
    const query = e.target.value.trim();
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        const suggestions = await searchLocations(query);
    }, 300);
}

function displaySuggestions(suggestions, type) {
    const container = document.getElementById('search-suggestions');
    
    if (!container) {
        console.warn('[App] Search suggestions container not found');
        return;
    }
    
    if (!suggestions || suggestions.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.innerHTML = '';
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <div class="suggestion-name">${suggestion.name}</div>
            <div class="suggestion-details">${suggestion.details}</div>
        `;
        
        item.addEventListener('click', () => {
            if (type === 'destination') {
                const destInput = document.getElementById('destination-search');
                if (destInput) {
                    destInput.value = suggestion.name;
                }
                container.classList.add('hidden');
            }
        });
        
        container.appendChild(item);
    });
    
    container.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
        const suggestions = document.getElementById('search-suggestions');
        if (suggestions) {
            suggestions.classList.add('hidden');
        }
    }
});

function initializeDatePicker() {
    // Now handled by calendar.js
    // Initialize location autocomplete only
    initializeLocationAutocomplete();
    return;
    
    // Initialize location autocomplete
    initializeLocationAutocomplete();
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    startDateInput.setAttribute('min', today);
    endDateInput.setAttribute('min', today);
    
    // Open calendar dropdown
    heroDateInput.addEventListener('click', (e) => {
        e.stopPropagation();
        calendarDropdown.classList.toggle('hidden');
    });
    
    // Update end date minimum when start date changes
    startDateInput.addEventListener('change', () => {
        endDateInput.setAttribute('min', startDateInput.value);
        if (endDateInput.value && endDateInput.value < startDateInput.value) {
            endDateInput.value = startDateInput.value;
        }
    });
    
    // Apply dates
    applyBtn.addEventListener('click', () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            
            const startStr = start.toLocaleDateString('en-US', options);
            const endStr = end.toLocaleDateString('en-US', options);
            
            heroDateInput.value = `${startStr} - ${endStr}`;
            calendarDropdown.classList.add('hidden');
        }
    });
    
    // Clear dates
    clearBtn.addEventListener('click', () => {
        startDateInput.value = '';
        endDateInput.value = '';
        heroDateInput.value = '';
    });
    
    // Close calendar when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.date-group') && !e.target.closest('.calendar-dropdown')) {
            calendarDropdown.classList.add('hidden');
        }
    });
    
    // Hero search functionality - go directly to trip dashboard
    const searchBtn = document.getElementById('hero-search');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const destination = document.getElementById('hero-destination').value;
            const dates = document.getElementById('hero-dates').value;
            const guests = document.getElementById('hero-who').value;
            
            if (!destination || !dates) {
                alert('Please select a destination and dates');
                return;
            }
            
            // Skip login and go directly to trip dashboard with itinerary
            // Create a temporary trip data
            const tripData = {
                id: 'temp-' + Date.now(),
                name: `Trip to ${destination}`,
                destination: destination,
                dates: dates,
                guests: guests,
                createdAt: new Date().toISOString()
            };
            
            // Store trip data
            localStorage.setItem('currentTrip', JSON.stringify(tripData));
            localStorage.setItem('currentTripId', tripData.id);
            
            // Hide all pages first
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
                page.classList.add('hidden');
            });
            
            // Show trip dashboard
            const dashboard = document.getElementById('trip-dashboard');
            if (dashboard) {
                dashboard.classList.remove('hidden');
                dashboard.classList.add('active');
            }
            
            // Update dashboard with trip info
            document.getElementById('dashboard-trip-name').textContent = tripData.name;
            document.getElementById('route-to').textContent = destination;
            document.getElementById('route-from').textContent = 'Your Location';
            document.getElementById('dashboard-dates').textContent = dates;
            document.getElementById('trip-code').textContent = tripData.id.slice(-6).toUpperCase();
            
            // Automatically switch to Itinerary tab
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            
            const itineraryTab = document.querySelector('[data-tab="itinerary"]');
            if (itineraryTab) {
                itineraryTab.classList.add('active');
                document.getElementById('itinerary-tab').classList.remove('hidden');
            }
            
            // Initialize itinerary cards for this trip
            if (window.itineraryCards) {
                window.itineraryCards.loadTrip(tripData.id);
            }
        });
    }
}

// Popular destinations with categories - defined globally for search function
const popularDestinations = [
    // Trending destinations
    { name: 'Paris', region: 'France', icon: '🗼', popular: true, category: 'trending' },
    { name: 'Tokyo', region: 'Japan', icon: '🗾', popular: true, category: 'trending' },
    { name: 'Dubai', region: 'UAE', icon: '🌆', popular: true, category: 'trending' },
    { name: 'Bali', region: 'Indonesia', icon: '🏝️', popular: true, category: 'trending' },
    
    // Beach destinations
    { name: 'Miami', region: 'Florida, USA', icon: '🏖️', popular: true, category: 'beach' },
    { name: 'Cancun', region: 'Mexico', icon: '🏖️', popular: true, category: 'beach' },
    { name: 'Maldives', region: 'Maldives', icon: '🏝️', popular: true, category: 'beach' },
    { name: 'Hawaii', region: 'USA', icon: '🌺', popular: true, category: 'beach' },
    
    // City breaks
    { name: 'New York', region: 'New York, USA', icon: '🗽', popular: true, category: 'city' },
    { name: 'London', region: 'England, UK', icon: '🇬🇧', popular: true, category: 'city' },
    { name: 'Barcelona', region: 'Spain', icon: '⛱️', popular: true, category: 'city' },
    { name: 'Rome', region: 'Italy', icon: '🏛️', popular: true, category: 'city' },
    { name: 'Amsterdam', region: 'Netherlands', icon: '🚲', popular: true, category: 'city' },
    { name: 'Los Angeles', region: 'California, USA', icon: '🌴', popular: true, category: 'city' },
    { name: 'Singapore', region: 'Singapore', icon: '🌃', popular: true, category: 'city' },
    { name: 'Las Vegas', region: 'Nevada, USA', icon: '🎰', popular: true, category: 'city' }
];

// Keep popularCities for backward compatibility
const popularCities = popularDestinations;

function initializeLocationAutocomplete() {
    // DISABLED - Now using PlacesAutocomplete component from location-inputs.js
    // The new places autocomplete provides better functionality with real location data
    
    const destinationInput = document.getElementById('hero-destination');
    const destinationSuggestions = document.getElementById('hero-destination-suggestions');
    const whoInput = document.getElementById('hero-who');
    const whoDropdown = document.getElementById('who-dropdown');
    
    // Hide the old suggestion dropdown permanently
    if (destinationSuggestions) {
        destinationSuggestions.style.display = 'none';
        destinationSuggestions.classList.add('hidden');
    }
    
    // Guest selector is still handled in guest-selector.js
    // Places autocomplete is handled in location-inputs.js
    
    return; // Exit early - old autocomplete is disabled
}

function displayPopularDestinations(container, input) {
    if (!container) return;
    
    container.innerHTML = '';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'location-header';
    header.innerHTML = '<span>Popular destinations</span>';
    container.appendChild(header);
    
    // Group destinations by category
    const trending = popularDestinations.filter(d => d.category === 'trending').slice(0, 4);
    const beaches = popularDestinations.filter(d => d.category === 'beach').slice(0, 4);
    const cities = popularDestinations.filter(d => d.category === 'city').slice(0, 8);
    
    // Display trending
    if (trending.length > 0) {
        const trendingHeader = document.createElement('div');
        trendingHeader.className = 'category-header';
        trendingHeader.innerHTML = '🔥 Trending now';
        container.appendChild(trendingHeader);
        
        trending.forEach(dest => {
            createDestinationItem(dest, container, input);
        });
    }
    
    // Display beach destinations
    if (beaches.length > 0) {
        const beachHeader = document.createElement('div');
        beachHeader.className = 'category-header';
        beachHeader.innerHTML = '🏖️ Beach getaways';
        container.appendChild(beachHeader);
        
        beaches.forEach(dest => {
            createDestinationItem(dest, container, input);
        });
    }
    
    // Display city destinations
    if (cities.length > 0) {
        const cityHeader = document.createElement('div');
        cityHeader.className = 'category-header';
        cityHeader.innerHTML = '🏙️ City escapes';
        container.appendChild(cityHeader);
        
        cities.forEach(dest => {
            createDestinationItem(dest, container, input);
        });
    }
    
    container.classList.remove('hidden');
}

function createDestinationItem(destination, container, input) {
    const item = document.createElement('div');
    item.className = 'location-item';
    if (destination.category === 'trending') {
        item.classList.add('trending');
    }
    
    item.innerHTML = `
        <div class="location-icon">${destination.icon}</div>
        <div class="location-details">
            <div class="location-name">${destination.name}</div>
            <div class="location-region">${destination.region}</div>
        </div>
        ${destination.category === 'trending' ? '<span class="trending-badge">Trending</span>' : ''}
    `;
    
    item.addEventListener('click', () => {
        input.value = `${destination.name}, ${destination.region}`;
        container.classList.add('hidden');
    });
    
    container.appendChild(item);
}

async function searchDestinations(query) {
    try {
        // First, check if query matches any popular destinations
        const queryLower = query.toLowerCase();
        const matchingPopular = popularDestinations.filter(dest => 
            dest.name.toLowerCase().includes(queryLower) ||
            dest.region.toLowerCase().includes(queryLower)
        );
        
        // Give priority to exact matches and starts-with matches
        matchingPopular.sort((a, b) => {
            const aStartsWith = a.name.toLowerCase().startsWith(queryLower);
            const bStartsWith = b.name.toLowerCase().startsWith(queryLower);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return 0;
        });
        
        // Search for cities and airports
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query)}&` +
            `format=json&` +
            `limit=10&` +
            `addressdetails=1`
        );
        const data = await response.json();
        
        // Also search specifically for airports
        const airportResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query + ' airport')}&` +
            `format=json&` +
            `limit=3&` +
            `addressdetails=1`
        );
        const airportData = await response.json();
        
        // Format the results
        const cityResults = data.map(item => {
            const parts = item.display_name.split(',');
            const city = item.address?.city || item.address?.town || parts[0].trim();
            const country = item.address?.country || '';
            const state = item.address?.state || '';
            
            let region = state ? `${state}, ${country}` : country;
            
            // Determine icon based on type or name
            let icon = '📍';
            if (item.type === 'aerodrome' || item.display_name.toLowerCase().includes('airport')) {
                icon = '✈️';
            } else if (item.type === 'city' || item.type === 'town') {
                icon = '🏙️';
            }
            
            return {
                name: city,
                region: region || parts.slice(1, 3).join(',').trim(),
                icon: icon,
                lat: item.lat,
                lon: item.lon
            };
        });
        
        // Combine popular matches at top with search results
        const combined = [...matchingPopular, ...cityResults];
        
        // Remove duplicates based on name
        const seen = new Set();
        return combined.filter(item => {
            const key = `${item.name}-${item.region}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, 12); // Show more results
        
    } catch (error) {
        console.error('Error searching destinations:', error);
        return [];
    }
}

// Alias for backward compatibility
const searchCities = searchDestinations;

function displayLocationSuggestions(suggestions, container, input) {
    if (!suggestions || suggestions.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.innerHTML = '';
    
    // Add header for popular cities
    if (suggestions[0] && suggestions[0].popular) {
        const header = document.createElement('div');
        header.className = 'location-header';
        header.innerHTML = '<span>Popular destinations</span>';
        container.appendChild(header);
    }
    
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'location-item';
        if (suggestion.popular) {
            item.classList.add('popular');
        }
        
        item.innerHTML = `
            <div class="location-icon">${suggestion.icon}</div>
            <div class="location-details">
                <div class="location-name">${suggestion.name}</div>
                <div class="location-region">${suggestion.region}</div>
            </div>
            ${suggestion.popular ? '<span class="popular-badge">Popular</span>' : ''}
        `;
        
        item.addEventListener('click', () => {
            input.value = `${suggestion.name}, ${suggestion.region}`;
            container.classList.add('hidden');
        });
        
        container.appendChild(item);
    });
    
    container.classList.remove('hidden');
}
function initializeGuestSelector() {
    console.log('Initializing guest selector');
    const MAX_GUESTS = 16;
    
    // Guest state - persist in localStorage
    let guests;
    try {
        guests = JSON.parse(localStorage.getItem('guestSelection')) || {
            adults: 2,
            children: 0,
            infants: 0,
            pets: 0
        };
    } catch (e) {
        guests = {
            adults: 2,
            children: 0,
            infants: 0,
            pets: 0
        };
    }
    
    const whoInput = document.getElementById('hero-who');
    const whoDropdown = document.getElementById('who-dropdown');
    const totalSummary = document.getElementById('total-guests-summary');
    const maxWarning = document.getElementById('max-guests-warning');
    const clearBtn = document.getElementById('clear-guests');
    const applyBtn = document.getElementById('apply-guests');
    
    if (!whoInput) {
        console.error('Who input not found');
        return;
    }
    
    // Update display with proper grammar
    function updateGuestDisplay() {
        const parts = [];
        
        if (guests.adults > 0) {
            parts.push(`${guests.adults} adult${guests.adults !== 1 ? 's' : ''}`);
        }
        if (guests.children > 0) {
            parts.push(`${guests.children} child${guests.children !== 1 ? 'ren' : ''}`);
        }
        if (guests.infants > 0) {
            parts.push(`${guests.infants} infant${guests.infants !== 1 ? 's' : ''}`);
        }
        if (guests.pets > 0) {
            parts.push(`${guests.pets} pet${guests.pets !== 1 ? 's' : ''}`);
        }
        
        // Format text for input field
        let displayText = parts.length > 0 ? parts.join(', ') : 'Add guests';
        
        if (whoInput) {
            whoInput.value = displayText;
        }
        
        // Update total summary
        const totalGuests = guests.adults + guests.children;
        if (totalSummary) {
            totalSummary.textContent = `${totalGuests} guest${totalGuests !== 1 ? 's' : ''} total`;
        }
        
        // Check max guests
        if (totalGuests > MAX_GUESTS) {
            maxWarning?.classList.remove('hidden');
            applyBtn?.setAttribute('disabled', 'true');
        } else {
            maxWarning?.classList.add('hidden');
            applyBtn?.removeAttribute('disabled');
        }
        
        // Update clear button state
        const hasGuests = guests.adults > 0 || guests.children > 0 || guests.infants > 0 || guests.pets > 0;
        if (clearBtn) {
            clearBtn.disabled = !hasGuests;
        }
        
        // Persist to localStorage
        localStorage.setItem('guestSelection', JSON.stringify(guests));
    }
    
    // Setup controls for each guest type
    ['adults', 'children', 'infants', 'pets'].forEach(type => {
        const minusBtn = document.getElementById(`${type}-minus`);
        const plusBtn = document.getElementById(`${type}-plus`);
        const countSpan = document.getElementById(`${type}-count`);
        
        if (!minusBtn || !plusBtn || !countSpan) return;
        
        const min = type === 'adults' ? 1 : 0;
        const max = type === 'pets' ? 5 : 20;
        
        // Update button states and ARIA labels
        function updateButtons() {
            const count = guests[type];
            
            // Update disabled state
            minusBtn.disabled = count <= min;
            plusBtn.disabled = count >= max || (type !== 'infants' && type !== 'pets' && 
                guests.adults + guests.children >= MAX_GUESTS);
            
            // Update display
            countSpan.textContent = count;
            
            // Update ARIA labels
            const typeName = type === 'children' ? 'child' : type.slice(0, -1);
            countSpan.setAttribute('aria-label', `${count} ${typeName}${count !== 1 ? type.slice(-1) : ''}`);
            
            updateGuestDisplay();
        }
        
        // Handle minus button
        minusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (guests[type] > min) {
                guests[type]--;
                updateButtons();
            }
        });
        
        // Handle plus button
        plusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const totalGuests = guests.adults + guests.children;
            
            if (type === 'infants' || type === 'pets') {
                // Infants and pets don't count toward max
                if (guests[type] < max) {
                    guests[type]++;
                    updateButtons();
                }
            } else {
                // Adults and children count toward max
                if (guests[type] < max && totalGuests < MAX_GUESTS) {
                    guests[type]++;
                    updateButtons();
                }
            }
        });
        
        // Keyboard support for steppers
        [minusBtn, plusBtn].forEach(btn => {
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });
        
        // Initialize
        updateButtons();
    });
    
    // Clear all button
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            guests = { adults: 1, children: 0, infants: 0, pets: 0 };
            ['adults', 'children', 'infants', 'pets'].forEach(type => {
                const countSpan = document.getElementById(`${type}-count`);
                if (countSpan) countSpan.textContent = guests[type];
                
                // Update button states
                const minusBtn = document.getElementById(`${type}-minus`);
                const plusBtn = document.getElementById(`${type}-plus`);
                if (minusBtn) minusBtn.disabled = guests[type] <= (type === 'adults' ? 1 : 0);
                if (plusBtn) plusBtn.disabled = false;
            });
            updateGuestDisplay();
        });
    }
    
    // Apply button
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            whoDropdown?.classList.add('hidden');
            whoInput?.setAttribute('aria-expanded', 'false');
        });
    }
    
    // Keyboard shortcuts
    if (whoDropdown) {
        document.addEventListener('keydown', (e) => {
            if (!whoDropdown.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    whoDropdown.classList.add('hidden');
                    whoInput?.setAttribute('aria-expanded', 'false');
                    whoInput?.focus();
                } else if (e.key === 'Enter' && e.target.id !== 'clear-guests') {
                    e.preventDefault();
                    applyBtn?.click();
                }
            }
        });
    }
    
    // Initialize display
    updateGuestDisplay();
    
    // Make updateGuestDisplay available globally
    window.updateGuestDisplay = updateGuestDisplay;
}
