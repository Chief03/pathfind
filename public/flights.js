'use strict';

(function() {
    let flights = [];
    let currentTripId = null;
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
        
        // Setup socket connection if available
        if (typeof io !== 'undefined') {
            socket = window.socket || io();
            setupSocketListeners();
        }
        
        // Get trip ID
        currentTripId = localStorage.getItem('currentTripId');
        
        // Load flights
        loadFlights();
        
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
                loadFlights();
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
                elements.modalTitle.textContent = 'Add Flight';
                elements.form.reset();
            }
            
            elements.modal.classList.remove('hidden');
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
                    loadFlights();
                } else {
                    console.error('[Flights] Save failed:', await response.text());
                    alert('Failed to save flight. Please try again.');
                }
            } catch (error) {
                console.error('[Flights] Save error:', error);
                alert('Error saving flight. Please try again.');
            }
        }
        
        async function deleteFlight(flightId) {
            if (!confirm('Are you sure you want to delete this flight?')) {
                return;
            }
            
            try {
                const response = await fetch(`/api/trips/${currentTripId}/flights/${flightId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    closeDrawer();
                    loadFlights();
                } else {
                    console.error('[Flights] Delete failed');
                    alert('Failed to delete flight. Please try again.');
                }
            } catch (error) {
                console.error('[Flights] Delete error:', error);
                alert('Error deleting flight. Please try again.');
            }
        }
        
        async function loadFlights() {
            if (!currentTripId) return;
            
            try {
                const response = await fetch(`/api/trips/${currentTripId}/flights`);
                if (response.ok) {
                    flights = await response.json();
                    renderFlights();
                }
            } catch (error) {
                console.error('[Flights] Load error:', error);
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
        }
    };
})();