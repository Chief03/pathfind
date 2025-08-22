'use strict';

/**
 * Events Discovery Module
 * Finds and suggests date-specific events for the trip
 */
(function() {
    let currentEvents = [];
    let selectedCategory = 'all';
    let currentCity = '';
    let tripDates = { start: null, end: null };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEventsDiscovery);
    } else {
        initEventsDiscovery();
    }
    
    function initEventsDiscovery() {
        console.log('[EventsDiscovery] Initializing...');
        
        // Get trip data
        const tripData = JSON.parse(localStorage.getItem('currentTrip') || '{}');
        currentCity = extractCityName(tripData.destination || tripData.destinationCity || '');
        tripDates.start = tripData.startDate;
        tripDates.end = tripData.endDate;
        
        // Create events section in itinerary tab
        setupEventsSection();
        
        // Load events if we have city and dates
        if (currentCity && tripDates.start) {
            loadEvents();
        }
        
        // Listen for trip updates
        window.addEventListener('tripUpdated', handleTripUpdate);
    }
    
    function extractCityName(destination) {
        if (!destination) return '';
        // Extract city name from "City, Country" format
        return destination.split(',')[0].trim();
    }
    
    function setupEventsSection() {
        const itineraryTab = document.getElementById('itinerary-tab');
        if (!itineraryTab) return;
        
        // Check if events section already exists
        let eventsSection = document.getElementById('events-discovery-section');
        if (eventsSection) return;
        
        // Create events discovery section
        eventsSection = document.createElement('div');
        eventsSection.id = 'events-discovery-section';
        eventsSection.className = 'events-discovery-section';
        eventsSection.innerHTML = `
            <div class="events-header">
                <h3>🎉 Events in <span id="events-city-name">${currentCity || 'your destination'}</span></h3>
                <p class="events-subtitle">Discover what's happening during your trip</p>
            </div>
            
            <div class="events-filters">
                <button class="event-filter-chip active" data-category="all">
                    All Events
                </button>
                <button class="event-filter-chip" data-category="Music">
                    🎵 Music
                </button>
                <button class="event-filter-chip" data-category="Sports">
                    ⚽ Sports
                </button>
                <button class="event-filter-chip" data-category="Theater">
                    🎭 Theater
                </button>
                <button class="event-filter-chip" data-category="Festival">
                    🎪 Festivals
                </button>
                <button class="event-filter-chip" data-category="Family">
                    👨‍👩‍👧‍👦 Family
                </button>
                <button class="event-filter-chip" data-category="Nightlife">
                    🌃 Nightlife
                </button>
                <button class="event-filter-chip" data-category="Outdoor">
                    🏞️ Outdoor
                </button>
                <button class="event-filter-chip" data-category="free">
                    🆓 Free
                </button>
            </div>
            
            <div id="events-loading" class="events-loading hidden">
                <div class="spinner"></div>
                <p>Finding events for your dates...</p>
            </div>
            
            <div id="events-container" class="events-container">
                <!-- Events will be loaded here -->
            </div>
            
            <div id="events-empty" class="events-empty hidden">
                <div class="empty-icon">📅</div>
                <h4>No events found</h4>
                <p>Try selecting different dates or categories</p>
            </div>
        `;
        
        // Insert before the itinerary cards container
        const cardsContainer = itineraryTab.querySelector('.itinerary-container');
        if (cardsContainer) {
            itineraryTab.insertBefore(eventsSection, cardsContainer);
        } else {
            itineraryTab.appendChild(eventsSection);
        }
        
        // Setup filter buttons
        setupFilterButtons();
    }
    
    function setupFilterButtons() {
        document.querySelectorAll('.event-filter-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                document.querySelectorAll('.event-filter-chip').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Filter events
                selectedCategory = e.currentTarget.dataset.category;
                filterEvents();
            });
        });
    }
    
    async function loadEvents() {
        if (!currentCity || !tripDates.start) return;
        
        // Show loading state
        const loadingEl = document.getElementById('events-loading');
        const containerEl = document.getElementById('events-container');
        const emptyEl = document.getElementById('events-empty');
        
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (containerEl) containerEl.innerHTML = '';
        if (emptyEl) emptyEl.classList.add('hidden');
        
        try {
            const params = new URLSearchParams({
                city: currentCity,
                startDate: tripDates.start,
                endDate: tripDates.end || tripDates.start
            });
            
            const response = await fetch(`/api/events?${params}`);
            const data = await response.json();
            
            currentEvents = data.events || [];
            
            // Group events by date
            const eventsByDate = groupEventsByDate(currentEvents);
            
            // Render events
            renderEvents(eventsByDate);
            
        } catch (error) {
            console.error('[EventsDiscovery] Error loading events:', error);
            showError();
        } finally {
            if (loadingEl) loadingEl.classList.add('hidden');
        }
    }
    
    function groupEventsByDate(events) {
        const grouped = {};
        
        events.forEach(event => {
            if (!grouped[event.date]) {
                grouped[event.date] = [];
            }
            grouped[event.date].push(event);
        });
        
        return grouped;
    }
    
    function renderEvents(eventsByDate) {
        const containerEl = document.getElementById('events-container');
        const emptyEl = document.getElementById('events-empty');
        
        if (!containerEl) return;
        
        const dates = Object.keys(eventsByDate).sort();
        
        if (dates.length === 0) {
            containerEl.innerHTML = '';
            if (emptyEl) emptyEl.classList.remove('hidden');
            return;
        }
        
        if (emptyEl) emptyEl.classList.add('hidden');
        containerEl.innerHTML = '';
        
        dates.forEach(date => {
            const dateSection = document.createElement('div');
            dateSection.className = 'events-date-section';
            
            // Format date nicely
            const dateObj = new Date(date + 'T00:00:00');
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            dateSection.innerHTML = `
                <div class="events-date-header">
                    <span class="date-badge">${dayName}, ${monthDay}</span>
                    <span class="event-count">${eventsByDate[date].length} events</span>
                </div>
                <div class="events-grid">
                    ${eventsByDate[date].map(event => createEventCard(event)).join('')}
                </div>
            `;
            
            containerEl.appendChild(dateSection);
        });
        
        // Add click handlers to all event cards
        attachEventHandlers();
    }
    
    function createEventCard(event) {
        const categoryIcon = getCategoryIcon(event.category);
        const priceClass = event.isFree ? 'free' : '';
        const sourceClass = event.source ? `source-${event.source.toLowerCase().replace(/\s+/g, '-')}` : '';
        
        // Format time nicely
        const timeDisplay = formatEventTime(event.time);
        
        // Check if we have an image
        const imageSection = event.image ? `
            <div class="event-image" style="background-image: url('${event.image}');">
                ${event.isPopular ? '<div class="popular-badge">🔥 Popular</div>' : ''}
                ${event.isOnSale ? '<div class="onsale-badge">On Sale</div>' : ''}
            </div>
        ` : '';
        
        // Show source badge if from real API
        const sourceBadge = event.source && event.source !== 'Generated' ? `
            <span class="event-source-badge ${sourceClass}">${event.source}</span>
        ` : '';
        
        return `
            <div class="event-card ${event.image ? 'has-image' : ''}" data-event-id="${event.id}">
                ${imageSection}
                ${!event.image && event.isPopular ? '<div class="popular-badge">🔥 Popular</div>' : ''}
                <div class="event-content">
                    <div class="event-header">
                        <span class="event-category-icon">${categoryIcon}</span>
                        <span class="event-time">${timeDisplay}</span>
                        ${sourceBadge}
                    </div>
                    <h4 class="event-title">${event.name}</h4>
                    <div class="event-venue">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        ${event.venue}
                    </div>
                    ${event.address ? `<div class="event-address">${event.address}</div>` : ''}
                    <div class="event-footer">
                        <span class="event-price ${priceClass}">${event.price || 'Check pricing'}</span>
                        <div class="event-actions">
                            ${event.url ? `
                                <a href="${event.url}" target="_blank" class="event-link-btn" title="View on ${event.source || 'website'}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </a>
                            ` : ''}
                            <button class="add-to-itinerary-btn" data-event='${JSON.stringify(event).replace(/'/g, "&apos;")}'>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function formatEventTime(time) {
        if (!time) return 'Time TBA';
        
        // Parse time string (HH:MM format)
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        
        return `${displayHour}:${minutes} ${ampm}`;
    }
    
    function getCategoryIcon(category) {
        const icons = {
            'Music': '🎵',
            'Sports': '⚽',
            'Theater': '🎭',
            'Comedy': '😂',
            'Festival': '🎪',
            'Family': '👨‍👩‍👧‍👦',
            'Nightlife': '🌃',
            'Outdoor': '🏞️',
            'Tours': '🚶',
            'Entertainment': '🎬',
            'Food & Drink': '🍷',
            'Special': '✨'
        };
        return icons[category] || '📅';
    }
    
    function attachEventHandlers() {
        document.querySelectorAll('.add-to-itinerary-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventData = JSON.parse(e.currentTarget.dataset.event);
                addEventToItinerary(eventData, e.currentTarget);
            });
        });
        
        document.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.add-to-itinerary-btn')) {
                    // Could open event details modal here
                    console.log('[EventsDiscovery] Event card clicked:', card.dataset.eventId);
                }
            });
        });
    }
    
    function addEventToItinerary(event, button) {
        console.log('[EventsDiscovery] Adding event to itinerary:', event);
        
        // Create itinerary item from event
        const itineraryItem = {
            id: `event-${event.id}`,
            location: event.venue,
            title: event.name,
            date: event.date,
            time: event.time,
            price: 0, // Parse from event.price if needed
            description: `${event.category} - ${event.description}`,
            category: 'Event',
            author: 'Events Discovery'
        };
        
        // Add to itinerary using the itinerary cards API
        if (window.itineraryCards && typeof window.itineraryCards.addCard === 'function') {
            const success = window.itineraryCards.addCard(itineraryItem);
            
            if (success) {
                // Update button to show added
                button.classList.add('added');
                button.innerHTML = '✓ Added';
                button.disabled = true;
                
                // Show notification
                showNotification(`Added "${event.name}" to your itinerary`);
            }
        }
    }
    
    function filterEvents() {
        const containerEl = document.getElementById('events-container');
        if (!containerEl) return;
        
        let filteredEvents = currentEvents;
        
        if (selectedCategory === 'free') {
            filteredEvents = currentEvents.filter(e => e.isFree);
        } else if (selectedCategory !== 'all') {
            filteredEvents = currentEvents.filter(e => e.category === selectedCategory);
        }
        
        const eventsByDate = groupEventsByDate(filteredEvents);
        renderEvents(eventsByDate);
    }
    
    function handleTripUpdate(e) {
        const tripData = e.detail || JSON.parse(localStorage.getItem('currentTrip') || '{}');
        const newCity = extractCityName(tripData.destination || tripData.destinationCity || '');
        const newDates = { start: tripData.startDate, end: tripData.endDate };
        
        // Check if city or dates changed
        if (newCity !== currentCity || newDates.start !== tripDates.start || newDates.end !== tripDates.end) {
            currentCity = newCity;
            tripDates = newDates;
            
            // Update city name in header
            const cityNameEl = document.getElementById('events-city-name');
            if (cityNameEl) cityNameEl.textContent = currentCity || 'your destination';
            
            // Reload events
            if (currentCity && tripDates.start) {
                loadEvents();
            }
        }
    }
    
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'event-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--emerald);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideInUp 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutDown 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    function showError() {
        const containerEl = document.getElementById('events-container');
        if (containerEl) {
            containerEl.innerHTML = `
                <div class="events-error">
                    <p>Unable to load events. Please try again later.</p>
                </div>
            `;
        }
    }
    
    // Public API
    window.eventsDiscovery = {
        reload: loadEvents,
        setCity: (city) => {
            currentCity = city;
            loadEvents();
        },
        setDates: (start, end) => {
            tripDates = { start, end };
            loadEvents();
        }
    };
    
    console.log('[EventsDiscovery] Module loaded');
})();