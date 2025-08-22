'use strict';

(function() {
    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearchHandler);
    } else {
        initSearchHandler();
    }
    
    function initSearchHandler() {
        console.log('[SearchHandler] Initializing...');
        
        const searchBtn = document.getElementById('hero-search');
        if (!searchBtn) {
            console.warn('[SearchHandler] Search button not found');
            return;
        }
        
        // Remove any existing listeners
        const newSearchBtn = searchBtn.cloneNode(true);
        searchBtn.parentNode.replaceChild(newSearchBtn, searchBtn);
        
        // Add new click handler
        newSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('[SearchHandler] Search clicked');
            
            const destination = document.getElementById('hero-destination').value;
            const dates = document.getElementById('hero-dates').value;
            const guests = document.getElementById('hero-who').value;
            
            if (!destination || !dates) {
                alert('Please select a destination and dates');
                return;
            }
            
            console.log('[SearchHandler] Creating trip:', { destination, dates, guests });
            
            // Parse dates to get start and end
            let startDate, endDate;
            if (dates.includes(' - ')) {
                const [start, end] = dates.split(' - ');
                startDate = new Date(start).toISOString().split('T')[0];
                endDate = new Date(end).toISOString().split('T')[0];
            } else {
                // Single date
                startDate = new Date(dates).toISOString().split('T')[0];
                endDate = startDate;
            }
            
            // Create trip data
            const tripData = {
                id: 'trip-' + Date.now(),
                name: `Trip to ${destination}`,
                destination: destination,
                dates: dates,
                startDate: startDate,
                endDate: endDate,
                guests: guests,
                createdAt: new Date().toISOString()
            };
            
            // Store trip data
            localStorage.setItem('currentTrip', JSON.stringify(tripData));
            localStorage.setItem('currentTripId', tripData.id);
            
            // Hide landing page
            const landingPage = document.getElementById('landing-page');
            if (landingPage) {
                landingPage.classList.remove('active');
                landingPage.style.display = 'none';
            }
            
            // Show trip dashboard
            const dashboard = document.getElementById('trip-dashboard');
            if (dashboard) {
                dashboard.classList.remove('hidden');
                dashboard.classList.add('active');
                dashboard.style.display = 'block';
            }
            
            // Update dashboard info
            const dashboardName = document.getElementById('dashboard-trip-name');
            if (dashboardName) dashboardName.textContent = tripData.name;
            
            const routeTo = document.getElementById('route-to');
            if (routeTo) routeTo.textContent = destination;
            
            const routeFrom = document.getElementById('route-from');
            if (routeFrom) routeFrom.textContent = 'Your Location';
            
            const dashboardDates = document.getElementById('dashboard-dates');
            if (dashboardDates) dashboardDates.textContent = dates;
            
            const tripCode = document.getElementById('trip-code');
            if (tripCode) tripCode.textContent = tripData.id.slice(-6).toUpperCase();
            
            // Switch to Itinerary tab
            const tabs = document.querySelectorAll('.tab');
            const tabContents = document.querySelectorAll('.tab-content');
            
            // Hide all tabs
            tabs.forEach(tab => tab.classList.remove('active'));
            tabContents.forEach(content => {
                content.classList.add('hidden');
                content.style.display = 'none';
            });
            
            // Show itinerary tab
            const itineraryTab = document.querySelector('[data-tab="itinerary"]');
            if (itineraryTab) {
                itineraryTab.classList.add('active');
            }
            
            const itineraryContent = document.getElementById('itinerary-tab');
            if (itineraryContent) {
                itineraryContent.classList.remove('hidden');
                itineraryContent.style.display = 'block';
            }
            
            // Initialize cards for this trip
            if (window.itineraryCards) {
                window.itineraryCards.loadTrip(tripData.id);
            }
            
            // Initialize flights for this trip
            if (window.flightsManager) {
                window.flightsManager.loadTrip(tripData.id);
            }
            
            console.log('[SearchHandler] Trip created and dashboard shown');
        });
        
        console.log('[SearchHandler] Initialization complete');
    }
})();