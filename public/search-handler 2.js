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
            
            const tripName = document.getElementById('hero-trip-name').value;
            const destination = document.getElementById('hero-destination').value;
            const dates = document.getElementById('hero-dates').value;
            const guests = document.getElementById('hero-who').value;
            
            if (!tripName || !destination || !dates) {
                alert('Please enter a trip name, select a destination and dates');
                return;
            }
            
            console.log('[SearchHandler] Creating trip:', { tripName, destination, dates, guests });
            
            // Parse dates to get start and end
            let startDate, endDate, numberOfNights = 0;
            if (dates.includes(' - ')) {
                const [start, end] = dates.split(' - ');
                const startDateObj = new Date(start);
                const endDateObj = new Date(end);
                startDate = startDateObj.toISOString().split('T')[0];
                endDate = endDateObj.toISOString().split('T')[0];
                
                // Calculate number of nights (excluding last night)
                const diffTime = Math.abs(endDateObj - startDateObj);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                numberOfNights = Math.max(0, diffDays - 1); // Subtract 1 to exclude last night
            } else {
                // Single date
                startDate = new Date(dates).toISOString().split('T')[0];
                endDate = startDate;
                numberOfNights = 0;
            }
            
            // Parse guest selection to get total travelers
            const guestSelection = JSON.parse(localStorage.getItem('guestSelection')) || {
                adults: 0,
                children: 0,
                infants: 0,
                pets: 0
            };
            const totalTravelers = guestSelection.adults + guestSelection.children + guestSelection.infants;
            
            // Create trip data
            const tripData = {
                id: 'trip-' + Date.now(),
                name: tripName,
                destination: destination,
                dates: dates,
                startDate: startDate,
                endDate: endDate,
                numberOfNights: numberOfNights,
                guests: guests,
                guestSelection: guestSelection,
                totalTravelers: totalTravelers,
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
            
            // Update overview page display
            const overviewDestination = document.getElementById('overview-destination');
            if (overviewDestination) {
                overviewDestination.textContent = tripData.name || `Trip to ${destination}`;
            }
            
            const overviewDates = document.getElementById('overview-dates');
            if (overviewDates) {
                overviewDates.textContent = dates;
            }
            
            // Update trip statistics
            const tripDuration = document.getElementById('trip-duration');
            if (tripDuration) {
                tripDuration.textContent = numberOfNights === 1 ? '1 night' : `${numberOfNights} nights`;
            }
            
            const travelerCount = document.getElementById('traveler-count');
            if (travelerCount) {
                travelerCount.textContent = totalTravelers;
            }
            
            // Switch to Overview tab
            const tabs = document.querySelectorAll('.tab');
            const tabContents = document.querySelectorAll('.tab-content');
            
            // Hide all tabs
            tabs.forEach(tab => tab.classList.remove('active'));
            tabContents.forEach(content => {
                content.classList.add('hidden');
                content.style.display = 'none';
            });
            
            // Show overview tab
            const overviewTab = document.querySelector('[data-tab="overview"]');
            if (overviewTab) {
                overviewTab.classList.add('active');
            }
            
            const overviewContent = document.getElementById('overview-tab');
            if (overviewContent) {
                overviewContent.classList.remove('hidden');
                overviewContent.style.display = 'block';
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