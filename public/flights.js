'use strict';

(function() {
    let flights = [];
    let currentTripId = null;
    
    // Sample flight data for demonstration
    const sampleFlights = [
        {
            id: 'sample-1',
            travelerName: 'Sarah Johnson',
            airline: 'Delta Airlines',
            flightNumber: 'DL 1542',
            departureAirport: 'JFK',
            arrivalAirport: 'LAX',
            arrivalDateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // Tomorrow
            notes: 'Terminal 4, Gate B12'
        },
        {
            id: 'sample-2',
            travelerName: 'Mike Chen',
            airline: 'United Airlines',
            flightNumber: 'UA 328',
            departureAirport: 'ORD',
            arrivalAirport: 'LAX',
            arrivalDateTime: new Date(Date.now() + 90000000).toISOString().slice(0, 16), // Tomorrow + 1 hour
            notes: 'Arriving at Terminal 7'
        },
        {
            id: 'sample-3',
            travelerName: 'Emma Davis',
            airline: 'Southwest',
            flightNumber: 'WN 2465',
            departureAirport: 'DFW',
            arrivalAirport: 'LAX',
            arrivalDateTime: new Date(Date.now() + 172800000).toISOString().slice(0, 16), // Day after tomorrow
            notes: ''
        }
    ];
    let editingFlightId = null;
    let selectedFlightId = null;
    let socket = null;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFlights);
    } else {
        initFlights();
    }
    
    function initFlights() {
        console.log('[Flights] Initializing...');
        
        // Get elements
        const elements = {
            emptyState: document.getElementById('flights-empty-state'),
            flightsList: document.getElementById('flights-list'),
            flightsContent: document.getElementById('flights-content'),
            addEmptyBtn: document.getElementById('add-flight-empty-btn'),
            addBtn: document.getElementById('add-flight-btn'),
            modal: document.getElementById('flight-modal'),
            modalTitle: document.getElementById('flight-modal-title'),
            modalClose: document.querySelector('.flight-modal-close'),
            cancelBtn: document.querySelector('#flight-modal .btn-cancel'),
            form: document.getElementById('flight-form'),
            drawer: document.getElementById('flight-drawer'),
            drawerClose: document.querySelector('.drawer-close'),
            drawerContent: document.getElementById('drawer-content'),
            editBtn: document.getElementById('edit-flight-btn'),
            deleteBtn: document.getElementById('delete-flight-btn'),
            // Form fields
            travelerName: document.getElementById('traveler-name'),
            airline: document.getElementById('airline'),
            flightNumber: document.getElementById('flight-number'),
            departureAirport: document.getElementById('departure-airport'),
            arrivalAirport: document.getElementById('arrival-airport'),
            arrivalDateTime: document.getElementById('arrival-datetime'),
            flightNotes: document.getElementById('flight-notes')
        };
        
        if (!elements.emptyState || !elements.flightsList) {
            console.warn('[Flights] Required elements not found');
            return;
        }
        
        // Setup socket connection if available (development only)
        if (typeof io !== 'undefined' && window.location.hostname === 'localhost') {
            socket = window.socket || io();
            setupSocketListeners();
        }
        
        // Get trip ID
        currentTripId = localStorage.getItem('currentTripId');
        
        // Load flights will be called after function definitions
        
        // Add button handlers
        if (elements.addEmptyBtn) {
            elements.addEmptyBtn.addEventListener('click', () => openFlightModal());
        }
        
        if (elements.addBtn) {
            elements.addBtn.addEventListener('click', () => openFlightModal());
        }
        
        // Modal handlers
        if (elements.modalClose) {
            elements.modalClose.addEventListener('click', closeFlightModal);
        }
        
        if (elements.cancelBtn) {
            elements.cancelBtn.addEventListener('click', closeFlightModal);
        }
        
        // Form submission
        if (elements.form) {
            elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                saveFlight();
            });
        }
        
        // Close modal on backdrop click
        if (elements.modal) {
            elements.modal.addEventListener('click', (e) => {
                if (e.target === elements.modal) {
                    closeFlightModal();
                }
            });
        }
        
        // Drawer handlers
        if (elements.drawerClose) {
            elements.drawerClose.addEventListener('click', closeDrawer);
        }
        
        if (elements.editBtn) {
            elements.editBtn.addEventListener('click', () => {
                if (selectedFlightId) {
                    closeDrawer();
                    openFlightModal(selectedFlightId);
                }
            });
        }
        
        if (elements.deleteBtn) {
            elements.deleteBtn.addEventListener('click', () => {
                if (selectedFlightId) {
                    deleteFlight(selectedFlightId);
                }
            });
        }
        
        // Auto-capitalize airport codes
        ['departure-airport', 'arrival-airport'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', (e) => {
                    e.target.value = e.target.value.toUpperCase();
                });
            }
        });
        
        // Revalidate on focus (when tab becomes visible)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('[Flights] Tab focused, revalidating...');
                if (typeof loadFlights === 'function') {
                    loadFlights().catch(err => {
                        console.error('[Flights] Failed to reload flights:', err);
                    });
                }
            }
        });
        
        // Flight modal functions
        function openFlightModal(flightId = null) {
            editingFlightId = flightId;
            
            if (flightId) {
                // Editing existing flight
                const flight = flights.find(f => f.id === flightId);
                if (flight) {
                    elements.modalTitle.textContent = 'Edit Flight';
                    elements.travelerName.value = flight.travelerName;
                    elements.airline.value = flight.airline;
                    elements.flightNumber.value = flight.flightNumber;
                    elements.departureAirport.value = flight.departureAirport;
                    elements.arrivalAirport.value = flight.arrivalAirport;
                    elements.arrivalDateTime.value = flight.arrivalDateTime;
                    elements.flightNotes.value = flight.notes || '';
                }
            } else {
                // Adding new flight
                elements.modalTitle.textContent = 'Add Your Flight Details';
                elements.form.reset();
                
                // Set default arrival date to tomorrow
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(14, 0, 0, 0);
                elements.arrivalDateTime.value = tomorrow.toISOString().slice(0, 16);
                
                // Setup traveler selector
                setupTravelerSelector();
            }
            
            elements.modal.classList.remove('hidden');
        }
        
        // Setup traveler selector buttons
        function setupTravelerSelector() {
            const travelerOptions = document.querySelectorAll('.traveler-option');
            const nameInput = document.getElementById('traveler-name');
            
            travelerOptions.forEach(option => {
                option.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Update active state
                    travelerOptions.forEach(opt => opt.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Show/hide name input based on selection
                    if (this.dataset.traveler === 'me') {
                        nameInput.style.display = 'none';
                        nameInput.value = 'Me';
                        nameInput.required = false;
                    } else {
                        nameInput.style.display = 'block';
                        nameInput.value = '';
                        nameInput.placeholder = "Enter friend's name";
                        nameInput.required = true;
                        nameInput.focus();
                    }
                });
            });
            
            // Set default to "Me"
            const meOption = document.querySelector('[data-traveler="me"]');
            if (meOption) {
                meOption.click();
            }
        }
        
        function closeFlightModal() {
            elements.modal.classList.add('hidden');
            elements.form.reset();
            editingFlightId = null;
        }
        
        async function saveFlight() {
            const flightData = {
                travelerName: elements.travelerName.value,
                airline: elements.airline.value,
                flightNumber: elements.flightNumber.value,
                departureAirport: elements.departureAirport.value.toUpperCase(),
                arrivalAirport: elements.arrivalAirport.value.toUpperCase(),
                arrivalDateTime: elements.arrivalDateTime.value,
                notes: elements.flightNotes.value
            };
            
            // If no currentTripId, save locally
            if (!currentTripId) {
                if (editingFlightId) {
                    // Update existing flight
                    const index = flights.findIndex(f => f.id === editingFlightId);
                    if (index !== -1) {
                        flights[index] = { ...flightData, id: editingFlightId };
                    }
                } else {
                    // Add new flight with generated ID
                    flightData.id = 'local-' + Date.now();
                    flights.push(flightData);
                }
                
                // Save to localStorage
                localStorage.setItem('localFlights', JSON.stringify(flights));
                closeFlightModal();
                renderFlights();
                return;
            }
            
            try {
                let response;
                if (editingFlightId) {
                    // Update existing flight
                    response = await fetch(`/api/trips/${currentTripId}/flights/${editingFlightId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(flightData)
                    });
                } else {
                    // Create new flight
                    response = await fetch(`/api/trips/${currentTripId}/flights`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(flightData)
                    });
                }
                
                if (response.ok) {
                    closeFlightModal();
                    if (typeof loadFlights === 'function') {
                        loadFlights();
                    }
                } else {
                    console.error('[Flights] Save failed:', await response.text());
                    alert('Failed to save flight. Please try again.');
                }
            } catch (error) {
                console.error('[Flights] Save error:', error);
                // Fallback to local storage
                if (editingFlightId) {
                    const index = flights.findIndex(f => f.id === editingFlightId);
                    if (index !== -1) {
                        flights[index] = { ...flightData, id: editingFlightId };
                    }
                } else {
                    flightData.id = 'local-' + Date.now();
                    flights.push(flightData);
                }
                localStorage.setItem('localFlights', JSON.stringify(flights));
                closeFlightModal();
                renderFlights();
            }
        }
        
        async function deleteFlight(flightId) {
            if (!confirm('Are you sure you want to delete this flight?')) {
                return;
            }
            
            // If no currentTripId, delete locally
            if (!currentTripId) {
                flights = flights.filter(f => f.id !== flightId);
                localStorage.setItem('localFlights', JSON.stringify(flights));
                closeDrawer();
                renderFlights();
                return;
            }
            
            try {
                const response = await fetch(`/api/trips/${currentTripId}/flights/${flightId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    closeDrawer();
                    if (typeof loadFlights === 'function') {
                        loadFlights();
                    }
                } else {
                    console.error('[Flights] Delete failed');
                    alert('Failed to delete flight. Please try again.');
                }
            } catch (error) {
                console.error('[Flights] Delete error:', error);
                // Fallback to local deletion
                flights = flights.filter(f => f.id !== flightId);
                localStorage.setItem('localFlights', JSON.stringify(flights));
                closeDrawer();
                renderFlights();
            }
        }
        
        async function loadFlights(params = {}) {
            const startTime = performance.now();
            const context = {
                tripId: currentTripId || params.tripId,
                source: params.source || 'unknown',
                timestamp: new Date().toISOString()
            };
            
            console.log('[Flights] Loading flights with context:', context);
            
            try {
                // Always check for locally saved flights first
                const localFlights = localStorage.getItem('localFlights');
                if (localFlights) {
                    try {
                        const parsed = JSON.parse(localFlights);
                        // Validate flight data if validators available
                        if (window.validators && typeof window.validators.validateFlightData === 'function') {
                            flights = window.validators.validateFlightData(parsed);
                        } else {
                            flights = Array.isArray(parsed) ? parsed : [];
                        }
                        console.log('[Flights] Loaded local flights:', flights.length);
                        renderFlights();
                        return flights;
                    } catch (e) {
                        console.warn('[Flights] Error parsing local flights:', e);
                        localStorage.removeItem('localFlights'); // Clear corrupted data
                    }
                }
                
                if (!context.tripId) {
                    // Show empty state to encourage adding flights
                    console.log('[Flights] No trip ID, showing empty state');
                    flights = [];
                    renderFlights();
                    return flights;
                }
                
                // Make API call with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
                
                try {
                    const response = await fetch(`/api/trips/${context.tripId}/flights`, {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        // Validate response data
                        if (window.validators && typeof window.validators.validateFlightData === 'function') {
                            flights = window.validators.validateFlightData(data);
                        } else {
                            flights = Array.isArray(data) ? data : [];
                        }
                        
                        // If no flights exist, optionally load sample data
                        if (flights.length === 0) {
                            const useSample = localStorage.getItem('useSampleFlights') !== 'false';
                            if (useSample) {
                                console.log('[Flights] No flights found, using sample data');
                                flights = [...sampleFlights];
                            }
                        }
                        
                        const loadTime = performance.now() - startTime;
                        console.log(`[Flights] Loaded ${flights.length} flights in ${loadTime.toFixed(2)}ms`);
                        renderFlights();
                        return flights;
                    } else {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    if (fetchError.name === 'AbortError') {
                        throw new Error('Request timeout - please check your connection');
                    }
                    throw fetchError;
                }
            } catch (error) {
                console.error('[Flights] Load error with context:', { error, context });
                
                // Don't show connection errors in production - just use fallback silently
                if (window.location.hostname === 'localhost') {
                    if (window.showNotification && typeof window.showNotification === 'function') {
                        window.showNotification('⚠️ Connection Issue', 'Using offline mode with sample flights');
                    }
                }
                
                // Fallback to sample data on error
                console.log('[Flights] Using fallback sample data');
                flights = [...sampleFlights];
                renderFlights();
                return flights;
            }
        }
        
        function renderFlights() {
            if (flights.length === 0) {
                // Show empty state
                elements.emptyState.classList.remove('hidden');
                elements.flightsList.classList.add('hidden');
            } else {
                // Show flights list
                elements.emptyState.classList.add('hidden');
                elements.flightsList.classList.remove('hidden');
                
                // Sort flights by arrival time
                const sortedFlights = [...flights].sort((a, b) => 
                    new Date(a.arrivalDateTime) - new Date(b.arrivalDateTime)
                );
                
                // Render flight items
                elements.flightsContent.innerHTML = '';
                sortedFlights.forEach(flight => {
                    const flightItem = createFlightItem(flight);
                    elements.flightsContent.appendChild(flightItem);
                });
            }
        }
        
        function createFlightItem(flight) {
            const div = document.createElement('div');
            div.className = 'flight-item';
            div.dataset.flightId = flight.id;
            
            // Format arrival time (timezone-aware)
            const arrival = new Date(flight.arrivalDateTime);
            const timeStr = arrival.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true
            });
            const dateStr = arrival.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            
            // Get initials for avatar
            const initials = flight.travelerName
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
            
            div.innerHTML = `
                <div class="flight-item-left">
                    <div class="flight-avatar">${initials}</div>
                    <div class="flight-info">
                        <div class="flight-traveler">${escapeHtml(flight.travelerName)}</div>
                        <div class="flight-route-info">
                            ${escapeHtml(flight.airline)} ${escapeHtml(flight.flightNumber)} • 
                            ${escapeHtml(flight.departureAirport)} → ${escapeHtml(flight.arrivalAirport)}
                        </div>
                    </div>
                </div>
                <div class="flight-item-right">
                    <div class="flight-arrival">
                        <div class="flight-arrival-time">${timeStr}</div>
                        <div class="flight-arrival-date">${dateStr}</div>
                    </div>
                    ${flight.notes ? '<div class="flight-notes-indicator">📝</div>' : ''}
                </div>
            `;
            
            // Click handler to open drawer
            div.addEventListener('click', () => {
                selectedFlightId = flight.id;
                showFlightDetails(flight);
            });
            
            return div;
        }
        
        function showFlightDetails(flight) {
            const arrival = new Date(flight.arrivalDateTime);
            const localTime = arrival.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZoneName: 'short'
            });
            
            elements.drawerContent.innerHTML = `
                <div class="detail-row">
                    <div class="detail-label">Traveler</div>
                    <div class="detail-value">${escapeHtml(flight.travelerName)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Flight</div>
                    <div class="detail-value">${escapeHtml(flight.airline)} ${escapeHtml(flight.flightNumber)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Route</div>
                    <div class="detail-value">${escapeHtml(flight.departureAirport)} → ${escapeHtml(flight.arrivalAirport)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Arrival Time</div>
                    <div class="detail-value">${localTime}</div>
                </div>
                ${flight.notes ? `
                <div class="detail-row">
                    <div class="detail-label">Notes</div>
                    <div class="detail-value">${escapeHtml(flight.notes)}</div>
                </div>
                ` : ''}
            `;
            
            elements.drawer.classList.add('open');
            elements.drawer.classList.remove('hidden');
        }
        
        function closeDrawer() {
            elements.drawer.classList.remove('open');
            setTimeout(() => {
                elements.drawer.classList.add('hidden');
            }, 300);
            selectedFlightId = null;
        }
        
        // Socket listeners for real-time updates
        function setupSocketListeners() {
            if (!socket) return;
            
            socket.on('flight-added', (flight) => {
                if (flight.tripId === currentTripId) {
                    flights.push(flight);
                    renderFlights();
                }
            });
            
            socket.on('flight-updated', (flight) => {
                if (flight.tripId === currentTripId) {
                    const index = flights.findIndex(f => f.id === flight.id);
                    if (index !== -1) {
                        flights[index] = flight;
                        renderFlights();
                    }
                }
            });
            
            socket.on('flight-deleted', (data) => {
                flights = flights.filter(f => f.id !== data.flightId);
                renderFlights();
            });
        }
        
        // Utility function
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        console.log('[Flights] Initialization complete');
    }
    
    // Export for external use
    window.flightsManager = {
        loadTrip: function(tripId) {
            currentTripId = tripId;
            loadFlights();
        },
        getFlights: function() {
            return flights;
        },
        loadFlights: loadFlights,  // Expose loadFlights function
        renderFlights: renderFlights  // Expose renderFlights for testing
    };
    
    // Defer exposing loadFlights until after it's defined
    // This will be done after the return statement
    
    // Quick add functions
    window.quickAddFlight = function(type) {
        const modal = document.getElementById('flight-modal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Setup form based on type
            const travelerOptions = document.querySelectorAll('.traveler-option');
            const nameInput = document.getElementById('traveler-name');
            
            if (type === 'me') {
                const meOption = document.querySelector('[data-traveler="me"]');
                if (meOption) {
                    travelerOptions.forEach(opt => opt.classList.remove('active'));
                    meOption.classList.add('active');
                    nameInput.style.display = 'none';
                    nameInput.value = 'Me';
                    nameInput.required = false;
                }
            } else {
                const friendOption = document.querySelector('[data-traveler="friend"]');
                if (friendOption) {
                    travelerOptions.forEach(opt => opt.classList.remove('active'));
                    friendOption.classList.add('active');
                    nameInput.style.display = 'block';
                    nameInput.value = '';
                    nameInput.placeholder = "Enter friend's name";
                    nameInput.required = true;
                    setTimeout(() => nameInput.focus(), 100);
                }
            }
            
            // Set default values
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(14, 0, 0, 0);
            document.getElementById('arrival-datetime').value = tomorrow.toISOString().slice(0, 16);
        }
    };
    
    // Add sample flights function
    window.addSampleFlights = function() {
        const sampleData = [
            {
                id: 'sample-' + Date.now(),
                travelerName: 'Sarah Johnson',
                airline: 'Delta Airlines',
                flightNumber: 'DL 1542',
                departureAirport: 'JFK',
                arrivalAirport: 'LAX',
                arrivalDateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                notes: 'Terminal 4, Gate B12'
            },
            {
                id: 'sample-' + Date.now() + 1,
                travelerName: 'Mike Chen',
                airline: 'United Airlines',
                flightNumber: 'UA 328',
                departureAirport: 'ORD',
                arrivalAirport: 'LAX',
                arrivalDateTime: new Date(Date.now() + 90000000).toISOString().slice(0, 16),
                notes: 'Arriving at Terminal 7'
            },
            {
                id: 'sample-' + Date.now() + 2,
                travelerName: 'Emma Davis',
                airline: 'Southwest',
                flightNumber: 'WN 2465',
                departureAirport: 'DFW',
                arrivalAirport: 'LAX',
                arrivalDateTime: new Date(Date.now() + 172800000).toISOString().slice(0, 16),
                notes: ''
            }
        ];
        
        flights = [...flights, ...sampleData];
        localStorage.setItem('localFlights', JSON.stringify(flights));
        loadFlights();
        
        // Show success message
        if (window.showToast) {
            window.showToast('Sample flights added! You can edit or delete them anytime.');
        }
    };
    
    // Expose loadFlights globally for backward compatibility
    window.loadFlights = loadFlights;
    
    // Expose a flag to indicate flights system is loaded
    window.flightsLoaded = true;
    
    // Initial load of flights after all functions are defined
    if (document.getElementById('flights-tab')) {
        loadFlights().catch(err => {
            console.error('[Flights] Failed to load flights:', err);
        });
    }
})();