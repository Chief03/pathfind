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
        newSearchBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('[SearchHandler] Search clicked - REDIRECTING TO TRIP-HERO HANDLER');
            
            // SECURITY: Delegate all trip creation to the secured trip-hero handler
            // This ensures consistent authentication enforcement
            if (window.handleStartTrip && typeof window.handleStartTrip === 'function') {
                console.log('[SearchHandler] Delegating to secured trip-hero handler');
                return await window.handleStartTrip(e);
            }
            
            // Fallback authentication check if trip-hero handler not available
            if (!window.authGuard) {
                alert('Authentication system not available. Please refresh the page.');
                return;
            }
            
            if (!(await window.authGuard.requireAuth('create a trip'))) {
                console.log('[SearchHandler] Authentication required - showing auth modal');
                return;
            }
            
            console.log('[SearchHandler] WARNING - Trip-hero handler not available, blocking action for security');
            alert('Trip creation system not available. Please refresh the page.');
            
            const tripNameEl = document.getElementById('hero-trip-name');
            const customTripCodeEl = document.getElementById('hero-trip-code');
            const destinationEl = document.getElementById('hero-destination');
            const datesEl = document.getElementById('hero-dates');
            const guestsEl = document.getElementById('hero-who');
            
            if (!tripNameEl || !destinationEl || !datesEl) {
                console.error('[SearchHandler] Required form elements not found');
                return;
            }
            
            const tripName = tripNameEl.value;
            const customTripCode = customTripCodeEl ? customTripCodeEl.value : '';
            const destination = destinationEl.value;
            const dates = datesEl.value;
            const guests = guestsEl ? guestsEl.value : '';
            
            if (!tripName || !destination || !dates) {
                alert('Please enter a trip name, select a destination and dates');
                return;
            }
            
            // Validate custom trip code if provided
            if (customTripCode) {
                const codeRegex = /^[A-Z0-9]{6,12}$/;
                if (!codeRegex.test(customTripCode.toUpperCase())) {
                    alert('Trip code must be 6-12 characters, using only letters and numbers');
                    return;
                }
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
                
                // Calculate number of nights (includes all nights except checkout night)
                const diffTime = Math.abs(endDateObj - startDateObj);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                numberOfNights = diffDays; // This gives us the correct number of nights
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
            
            // Generate trip ID - use custom code or auto-generate
            const tripId = customTripCode ? 
                customTripCode.toUpperCase() : 
                'TRIP' + Date.now().toString(36).toUpperCase().slice(-6);
            
            // Create trip data
            const tripData = {
                id: tripId,
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
            if (tripCode) tripCode.textContent = tripData.id;
            
            // Also update overview trip code display
            const overviewTripCode = document.getElementById('trip-code-overview');
            if (overviewTripCode) overviewTripCode.textContent = tripData.id;
            
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
            
            // Update trip planning progress
            if (window.updateTripProgress) {
                // Small delay to ensure DOM is updated
                setTimeout(() => {
                    window.updateTripProgress(tripData);
                }, 100);
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