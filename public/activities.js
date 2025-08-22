'use strict';

(function() {
    let activities = [];
    let currentCity = '';
    let currentTripData = null;
    let lastFetchTime = 0;
    const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initActivities);
    } else {
        initActivities();
    }
    
    function initActivities() {
        console.log('[Activities] Initializing...');
        
        // Get elements
        const elements = {
            container: document.getElementById('activities-container'),
            emptyState: document.getElementById('activities-empty-state'),
            emptyCityName: document.getElementById('empty-city-name'),
            loadingState: document.getElementById('activities-loading'),
            refreshBtn: document.getElementById('refresh-activities-btn'),
            findBtn: document.getElementById('find-activities-btn')
        };
        
        if (!elements.container) {
            console.warn('[Activities] Container not found');
            return;
        }
        
        // Get trip data
        currentTripData = JSON.parse((typeof localStorage !== 'undefined' ? localStorage.getItem('currentTrip') : null) || '{}');
        
        // Extract city name from destination (handles "Barcelona, Spain" format)
        let destination = currentTripData.destination || currentTripData.destinationCity || '';
        if (destination.includes(',')) {
            // Take first part before comma (e.g., "Barcelona" from "Barcelona, Spain")
            destination = destination.split(',')[0].trim();
        }
        currentCity = destination || 'Barcelona';
        console.log('[Activities] Using destination city:', currentCity);
        
        // Set city name in empty state
        if (elements.emptyCityName) {
            elements.emptyCityName.textContent = currentCity;
        }
        
        // Load activities
        loadActivities();
        
        // Refresh button
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', () => {
                if (elements.refreshBtn) {
                    elements.refreshBtn.classList.add('spinning');
                }
                loadActivities(true).finally(() => {
                    if (elements.refreshBtn) {
                        elements.refreshBtn.classList.remove('spinning');
                    }
                });
            });
        }
        
        // Find activities button
        if (elements.findBtn) {
            elements.findBtn.addEventListener('click', () => {
                loadActivities(true);
            });
        }
        
        // Reload on tab focus
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                const now = Date.now();
                if (now - lastFetchTime > CACHE_DURATION) {
                    console.log('[Activities] Refreshing due to cache expiry');
                    loadActivities();
                }
            }
        });
        
        // Listen for trip changes and clear cache
        if (typeof window !== 'undefined') {
            let lastTripData = JSON.stringify(currentTripData);
            const checkTripChange = () => {
                const newTripData = JSON.parse((typeof localStorage !== 'undefined' ? localStorage.getItem('currentTrip') : null) || '{}');
                const newTripDataString = JSON.stringify(newTripData);
                
                if (newTripDataString !== lastTripData) {
                    console.log('[Activities] Trip data changed, clearing cache and reloading');
                    lastTripData = newTripDataString;
                    currentTripData = newTripData;
                    
                    // Update city
                    let destination = currentTripData.destination || currentTripData.destinationCity || '';
                    if (destination.includes(',')) {
                        destination = destination.split(',')[0].trim();
                    }
                    currentCity = destination || 'Barcelona';
                    
                    // Clear cache and reload
                    activities = [];
                    lastFetchTime = 0;
                    if (typeof localStorage !== 'undefined') {
                        localStorage.removeItem('cachedActivities');
                    }
                    
                    // Update empty state city name
                    if (elements.emptyCityName) {
                        elements.emptyCityName.textContent = currentCity;
                    }
                    
                    loadActivities(true);
                }
            };
            
            // Check for trip changes every 2 seconds when tab is visible
            setInterval(() => {
                if (!document.hidden) {
                    checkTripChange();
                }
            }, 2000);
        }
        
        async function loadActivities(forceRefresh = false) {
            // Check cache
            if (!forceRefresh && activities.length > 0 && Date.now() - lastFetchTime < CACHE_DURATION) {
                console.log('[Activities] Using cached activities');
                renderActivities();
                return;
            }
            
            // Show loading state
            showLoading();
            
            try {
                const params = new URLSearchParams({
                    city: currentCity,
                    start: currentTripData.startDate || '',
                    end: currentTripData.endDate || ''
                });
                
                const response = await fetch(`/api/activities?${params}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch activities');
                }
                
                const data = await response.json();
                activities = data.items || [];
                lastFetchTime = Date.now();
                
                // Save to cache
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('cachedActivities', JSON.stringify({
                        city: currentCity,
                        items: activities,
                        timestamp: lastFetchTime
                    }));
                }
                
                renderActivities();
            } catch (error) {
                console.error('[Activities] Load error:', error);
                showError();
            }
        }
        
        function showLoading() {
            if (elements.loadingState) elements.loadingState.classList.remove('hidden');
            if (elements.emptyState) elements.emptyState.classList.add('hidden');
            if (elements.container) elements.container.innerHTML = '';
        }
        
        function showError() {
            if (elements.loadingState) elements.loadingState.classList.add('hidden');
            if (elements.emptyState) elements.emptyState.classList.remove('hidden');
            if (elements.container) elements.container.innerHTML = '';
        }
        
        function renderActivities() {
            if (elements.loadingState) elements.loadingState.classList.add('hidden');
            
            if (activities.length === 0) {
                if (elements.emptyState) elements.emptyState.classList.remove('hidden');
                if (elements.container) elements.container.innerHTML = '';
                return;
            }
            
            if (elements.emptyState) elements.emptyState.classList.add('hidden');
            if (elements.container) elements.container.innerHTML = '';
            
            // Separate top picks from other activities
            const topPicks = activities.filter(a => a.source?.name === 'Top Pick');
            const otherActivities = activities.filter(a => a.source?.name !== 'Top Pick');
            
            // Render top picks first
            if (topPicks.length > 0 && elements.container) {
                const topPicksSection = createTopPicksSection(topPicks);
                elements.container.appendChild(topPicksSection);
            }
            
            // Render other activities
            if (elements.container) {
                otherActivities.forEach(activity => {
                    const card = createActivityCard(activity);
                    elements.container.appendChild(card);
                });
            }
        }
        
        function createTopPicksSection(picks) {
            const section = document.createElement('div');
            section.className = 'top-picks-section';
            
            const header = document.createElement('div');
            header.className = 'top-picks-header';
            header.innerHTML = `
                <h5>Top Picks</h5>
                <span class="top-picks-badge">Must See</span>
            `;
            section.appendChild(header);
            
            const grid = document.createElement('div');
            grid.className = 'activities-container';
            
            picks.forEach(pick => {
                const card = createActivityCard(pick, true);
                grid.appendChild(card);
            });
            
            section.appendChild(grid);
            return section;
        }
        
        function createActivityCard(activity, isTopPick = false) {
            const card = document.createElement('div');
            card.className = 'activity-card';
            card.tabIndex = 0;
            card.setAttribute('role', 'article');
            card.setAttribute('aria-label', activity.title);
            
            // Create image or placeholder
            let imageHtml = '';
            if (activity.image) {
                imageHtml = `<img src="${activity.image}" alt="${activity.title}" class="activity-image" loading="lazy">`;
            } else {
                const emoji = getCategoryEmoji(activity.category);
                imageHtml = `<div class="activity-image placeholder">${emoji}</div>`;
            }
            
            // Format rating
            const ratingHtml = activity.rating ? 
                `<div class="activity-rating">
                    <span class="star">★</span>
                    <span>${activity.rating}</span>
                </div>` : '';
            
            // Format price
            const priceClass = activity.price === 'Free' ? 'free' : '';
            const priceHtml = activity.price ? 
                `<div class="activity-price ${priceClass}">${activity.price}</div>` : '';
            
            // Category class
            const categoryClass = activity.category.toLowerCase().replace(/\s+/g, '-');
            
            card.innerHTML = `
                ${imageHtml}
                <div class="activity-content">
                    <div class="activity-header-row">
                        <span class="activity-category ${categoryClass}">${activity.category}</span>
                        <button class="activity-add-btn" aria-label="Add to itinerary" data-activity-id="${activity.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                    <h5 class="activity-title">${escapeHtml(activity.title)}</h5>
                    ${activity.description ? `<p class="activity-description">${escapeHtml(activity.description)}</p>` : ''}
                    <div class="activity-footer">
                        <div class="activity-info">
                            ${priceHtml}
                            ${ratingHtml}
                        </div>
                        ${activity.source?.url ? 
                            `<a href="${activity.source.url}" target="_blank" rel="noopener noreferrer" class="activity-source">${activity.source.name} →</a>` :
                            `<span class="activity-source">${activity.source?.name || ''}</span>`
                        }
                    </div>
                </div>
            `;
            
            // Add button handler
            const addBtn = card.querySelector('.activity-add-btn');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    addToItinerary(activity, addBtn);
                });
            }
            
            // Card click handler (for more details)
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.activity-add-btn') && !e.target.closest('.activity-source')) {
                    showActivityDetails(activity);
                }
            });
            
            return card;
        }
        
        async function addToItinerary(activity, button) {
            if (!button || !activity) return;
            
            // Disable button and show loading
            button.setAttribute('aria-busy', 'true');
            button.disabled = true;
            
            try {
                console.log('[Activities] Adding to itinerary:', activity.title);
                
                // Ensure trip ID is available for the itinerary system
                const tripData = JSON.parse((typeof localStorage !== 'undefined' ? localStorage.getItem('currentTrip') : null) || '{}');
                let tripId = tripData.id || tripData.tripId;
                if (!tripId && typeof localStorage !== 'undefined') {
                    tripId = localStorage.getItem('currentTripId');
                }
                
                if (!tripId) {
                    // Create a temporary trip ID if none exists
                    tripId = 'temp-' + Date.now();
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('currentTripId', tripId);
                        const updatedTripData = { ...tripData, id: tripId };
                        localStorage.setItem('currentTrip', JSON.stringify(updatedTripData));
                    }
                    console.log('[Activities] Created temporary trip ID:', tripId);
                }
                
                // Wait for itinerary system to be ready
                let retries = 0;
                while ((!window.itineraryCards || typeof window.itineraryCards.addCard !== 'function') && retries < 20) {
                    console.log('[Activities] Waiting for itinerary system to load... (attempt', retries + 1, ')');
                    await new Promise(resolve => setTimeout(resolve, 100));
                    retries++;
                }
                
                if (!window.itineraryCards || typeof window.itineraryCards.addCard !== 'function') {
                    console.error('[Activities] Itinerary system not available after waiting');
                    console.log('[Activities] window.itineraryCards:', window.itineraryCards);
                    console.log('[Activities] addCard function:', window.itineraryCards?.addCard);
                    throw new Error('Please refresh the page and try again');
                }
                
                // Initialize itinerary system with trip ID if needed
                if (typeof window.itineraryCards.loadTrip === 'function') {
                    window.itineraryCards.loadTrip(tripId);
                    console.log('[Activities] Initialized itinerary system with trip ID:', tripId);
                    // Give it a moment to load the trip data
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // Create itinerary item from activity
                const itineraryItem = {
                    id: `activity-${activity.id}-${Date.now()}`,
                    title: activity.title,
                    location: activity.title,
                    date: currentTripData.startDate || new Date().toISOString().split('T')[0],
                    time: activity.startTime ? 
                        new Date(activity.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 
                        '12:00',
                    price: parseFloat(activity.price?.replace(/[^0-9.]/g, '')) || 0,
                    description: activity.description || '',
                    category: activity.category || 'Activity',
                    author: 'Added from Activities',
                    source: activity.source,
                    timestamp: new Date().toISOString()
                };
                
                // Add to itinerary cards using the new API
                console.log('[Activities] window.itineraryCards available:', !!window.itineraryCards);
                
                if (window.itineraryCards) {
                    console.log('[Activities] addCard function available:', typeof window.itineraryCards.addCard);
                    
                    if (typeof window.itineraryCards.addCard === 'function') {
                        const success = window.itineraryCards.addCard(itineraryItem);
                        
                        if (success) {
                            // Mark as added
                            button.classList.add('added');
                            button.innerHTML = '✓';
                            button.setAttribute('aria-label', 'Added to itinerary');
                            
                            // Show success message
                            showNotification(`Added "${activity.title}" to itinerary`);
                            console.log('[Activities] Successfully added to itinerary');
                            
                            // Refresh itinerary view to show the new item
                            if (typeof window.itineraryCards.refreshView === 'function') {
                                setTimeout(() => window.itineraryCards.refreshView(), 100);
                            }
                            
                            // Switch to itinerary tab to show the newly added item
                            const itineraryTab = document.querySelector('[data-tab="itinerary"]');
                            if (itineraryTab && !itineraryTab.classList.contains('active')) {
                                setTimeout(() => {
                                    showNotification('Check your itinerary to see the added activity!', 'info');
                                }, 2000);
                            }
                        } else {
                            throw new Error('Failed to add to itinerary');
                        }
                    } else {
                        console.error('[Activities] addCard function not found on itineraryCards');
                        throw new Error('Itinerary system is not ready yet. Please try again.');
                    }
                } else {
                    console.error('[Activities] window.itineraryCards not available');
                    console.log('[Activities] Available window properties:', Object.keys(window).filter(k => k.includes('itinerary')));
                    throw new Error('Itinerary system is loading. Please try again in a moment.');
                }
            } catch (error) {
                console.error('[Activities] Add to itinerary error:', error);
                // Show user-friendly error message
                const errorMessage = error.message || 'Failed to add to itinerary. Please try again.';
                showNotification(errorMessage, 'error');
                
                // Re-enable button for retry
                button.disabled = false;
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                `;
                button.setAttribute('aria-label', 'Add to itinerary');
            } finally {
                button.setAttribute('aria-busy', 'false');
            }
        }
        
        function showActivityDetails(activity) {
            // You could open a modal or expand the card here
            console.log('[Activities] Show details for:', activity);
            
            // For now, just log the details
            if (activity.source?.url) {
                window.open(activity.source.url, '_blank');
            }
        }
        
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = 'activity-notification';
            notification.textContent = message;
            
            let backgroundColor = 'var(--emerald)';
            if (type === 'error') backgroundColor = '#dc3545';
            else if (type === 'info') backgroundColor = '#0066cc';
            
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: ${backgroundColor};
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
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }, 3000);
        }
        
        function getCategoryEmoji(category) {
            const emojis = {
                'Landmark': '🏛️',
                'Museum': '🖼️',
                'Sports': '⚽',
                'Concert': '🎵',
                'Attraction': '🎢',
                'Tour': '🚶',
                'Festival': '🎉',
                'Food': '🍽️',
                'Comedy': '🎭',
                'Theater': '🎭'
            };
            return emojis[category] || '📍';
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        console.log('[Activities] Initialization complete');
    }
    
    // Export for external use
    window.activitiesManager = {
        loadCity: function(city) {
            currentCity = city;
            loadActivities(true);
        },
        refresh: function() {
            loadActivities(true);
        }
    };
})();