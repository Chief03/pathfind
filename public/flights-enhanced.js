/**
 * Enhanced Flight Management System
 * Complete implementation with empty state, CRUD operations, and real-time updates
 */

'use strict';

(function() {
    // State management
    let currentTripId = null;
    let currentUserId = null;
    let flights = [];
    let tripMembers = [];
    let editingFlight = null;
    let isLoading = false;
    
    // DOM elements cache
    const elements = {};
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFlightSystem);
    } else {
        initFlightSystem();
    }
    
    function initFlightSystem() {
        console.log('[FlightSystem] Initializing enhanced flight management...');
        
        // Get trip and user info
        currentTripId = localStorage.getItem('currentTripId');
        currentUserId = localStorage.getItem('currentUserId') || 'user1'; // Default for testing
        
        // Cache DOM elements
        cacheElements();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load initial data
        if (currentTripId) {
            loadFlights();
        } else {
            showEmptyState('no-trip');
        }
        
        // Setup real-time updates
        setupRealtimeUpdates();
    }
    
    function cacheElements() {
        elements.container = document.getElementById('flights-container');
        elements.emptyState = document.getElementById('flights-empty-state');
        elements.flightsList = document.getElementById('flights-list');
        elements.loadingState = document.getElementById('flights-loading');
        elements.errorState = document.getElementById('flights-error');
        elements.addFlightBtn = document.getElementById('add-flight-btn');
        elements.addForFriendBtn = document.getElementById('add-for-friend-btn');
        elements.flightModal = document.getElementById('flight-modal-enhanced');
        elements.flightForm = document.getElementById('flight-form-enhanced');
        elements.modalTitle = document.getElementById('flight-modal-title');
        elements.deleteConfirm = document.getElementById('delete-confirm-modal');
        
        // Create container if it doesn't exist
        if (!elements.container) {
            elements.container = createFlightContainer();
            document.querySelector('.flights-tab-content')?.appendChild(elements.container);
        }
    }
    
    function createFlightContainer() {
        const container = document.createElement('div');
        container.id = 'flights-container';
        container.className = 'flights-container';
        container.innerHTML = `
            <!-- Loading State -->
            <div id="flights-loading" class="loading-state hidden">
                <div class="loading-spinner"></div>
                <p>Loading flights...</p>
            </div>
            
            <!-- Error State -->
            <div id="flights-error" class="error-state hidden">
                <svg class="error-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Unable to load flights</h3>
                <p class="error-message">Please check your connection and try again</p>
                <button class="btn-retry" onclick="window.flightSystem.retry()">Retry</button>
            </div>
            
            <!-- Empty State -->
            <div id="flights-empty-state" class="empty-state hidden">
                <div class="empty-state-card">
                    <svg class="empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <h3>No flights yet</h3>
                    <p>Start adding flights to coordinate everyone's arrival</p>
                    <div class="empty-actions">
                        <button id="add-flight-btn" class="btn btn-primary">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add a flight
                        </button>
                        <button id="add-for-friend-btn" class="btn btn-secondary">
                            Add for a friend
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Flights List -->
            <div id="flights-list" class="flights-list hidden"></div>
            
            <!-- Add Flight Button (when list has items) -->
            <div id="flights-actions" class="flights-actions hidden">
                <button class="btn btn-add-flight">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add flight
                </button>
            </div>
        `;
        
        // Add modal HTML
        container.innerHTML += createFlightModal();
        container.innerHTML += createDeleteConfirmModal();
        
        return container;
    }
    
    function createFlightModal() {
        return `
            <div id="flight-modal-enhanced" class="modal hidden" role="dialog" aria-labelledby="flight-modal-title">
                <div class="modal-backdrop" onclick="window.flightSystem.closeModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="flight-modal-title">Add Flight</h2>
                        <button class="modal-close" onclick="window.flightSystem.closeModal()" aria-label="Close">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    
                    <form id="flight-form-enhanced" class="flight-form">
                        <!-- Traveler Selection -->
                        <div class="form-group">
                            <label for="flight-traveler">Who's flying?</label>
                            <div class="traveler-selector">
                                <button type="button" class="traveler-option active" data-traveler="me">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    Me
                                </button>
                                <button type="button" class="traveler-option" data-traveler="friend">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="8.5" cy="7" r="4"></circle>
                                        <line x1="20" y1="8" x2="20" y2="14"></line>
                                        <line x1="23" y1="11" x2="17" y2="11"></line>
                                    </svg>
                                    Friend
                                </button>
                            </div>
                            <select id="friend-selector" class="form-control hidden" aria-label="Select friend">
                                <option value="">Select a friend...</option>
                            </select>
                        </div>
                        
                        <!-- Airline -->
                        <div class="form-group">
                            <label for="flight-airline">Airline *</label>
                            <input type="text" 
                                   id="flight-airline" 
                                   class="form-control" 
                                   required 
                                   list="airlines-list"
                                   placeholder="e.g., American Airlines"
                                   aria-required="true">
                            <datalist id="airlines-list">
                                <option value="American Airlines">
                                <option value="Delta">
                                <option value="United">
                                <option value="Southwest">
                                <option value="JetBlue">
                                <option value="Alaska Airlines">
                                <option value="Spirit">
                                <option value="Frontier">
                            </datalist>
                            <span class="error-message" id="airline-error"></span>
                        </div>
                        
                        <!-- Flight Number -->
                        <div class="form-group">
                            <label for="flight-number">Flight Number</label>
                            <input type="text" 
                                   id="flight-number" 
                                   class="form-control" 
                                   placeholder="e.g., AA1234"
                                   pattern="[A-Z]{2,3}[0-9]{1,5}">
                            <span class="error-message" id="flight-number-error"></span>
                        </div>
                        
                        <!-- Route -->
                        <div class="form-row">
                            <div class="form-group">
                                <label for="departure-airport">From (Airport) *</label>
                                <input type="text" 
                                       id="departure-airport" 
                                       class="form-control airport-input" 
                                       required 
                                       placeholder="JFK"
                                       maxlength="3"
                                       pattern="[A-Z]{3}"
                                       aria-required="true">
                                <span class="error-message" id="departure-error"></span>
                            </div>
                            <div class="form-group">
                                <label for="arrival-airport">To (Airport) *</label>
                                <input type="text" 
                                       id="arrival-airport" 
                                       class="form-control airport-input" 
                                       required 
                                       placeholder="LAX"
                                       maxlength="3"
                                       pattern="[A-Z]{3}"
                                       aria-required="true">
                                <span class="error-message" id="arrival-error"></span>
                            </div>
                        </div>
                        
                        <!-- Arrival DateTime -->
                        <div class="form-group">
                            <label for="arrival-datetime">Arrival Date & Time *</label>
                            <input type="datetime-local" 
                                   id="arrival-datetime" 
                                   class="form-control" 
                                   required
                                   aria-required="true">
                            <small class="form-hint">Time shown in your local timezone</small>
                            <span class="error-message" id="datetime-error"></span>
                        </div>
                        
                        <!-- Additional Details -->
                        <details class="form-details">
                            <summary>Additional Information</summary>
                            <div class="form-group">
                                <label for="confirmation-number">Confirmation Number</label>
                                <input type="text" 
                                       id="confirmation-number" 
                                       class="form-control" 
                                       placeholder="ABC123">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="terminal">Terminal</label>
                                    <input type="text" 
                                           id="terminal" 
                                           class="form-control" 
                                           placeholder="2">
                                </div>
                                <div class="form-group">
                                    <label for="gate">Gate</label>
                                    <input type="text" 
                                           id="gate" 
                                           class="form-control" 
                                           placeholder="A5">
                                </div>
                                <div class="form-group">
                                    <label for="seat">Seat</label>
                                    <input type="text" 
                                           id="seat" 
                                           class="form-control" 
                                           placeholder="12A">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="flight-notes">Notes</label>
                                <textarea id="flight-notes" 
                                          class="form-control" 
                                          rows="2" 
                                          placeholder="Any additional information..."></textarea>
                            </div>
                        </details>
                        
                        <!-- Form Actions -->
                        <div class="form-actions">
                            <button type="button" class="btn btn-cancel" onclick="window.flightSystem.closeModal()">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary" id="save-flight-btn">
                                Save Flight
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }
    
    function createDeleteConfirmModal() {
        return `
            <div id="delete-confirm-modal" class="modal hidden" role="dialog">
                <div class="modal-backdrop" onclick="window.flightSystem.cancelDelete()"></div>
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <h3>Delete Flight?</h3>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete this flight? This action cannot be undone.</p>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-cancel" onclick="window.flightSystem.cancelDelete()">
                            Cancel
                        </button>
                        <button class="btn btn-danger" onclick="window.flightSystem.confirmDelete()">
                            Delete Flight
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    function setupEventListeners() {
        // Empty state buttons
        const addBtn = document.getElementById('add-flight-btn');
        const addForFriendBtn = document.getElementById('add-for-friend-btn');
        
        if (addBtn) {
            addBtn.addEventListener('click', () => openFlightModal());
        }
        
        if (addForFriendBtn) {
            addForFriendBtn.addEventListener('click', () => openFlightModal('friend'));
        }
        
        // Form submission
        const form = document.getElementById('flight-form-enhanced');
        if (form) {
            form.addEventListener('submit', handleFlightSubmit);
        }
        
        // Traveler selector
        document.querySelectorAll('.traveler-option').forEach(btn => {
            btn.addEventListener('click', handleTravelerSelection);
        });
        
        // Airport input auto-uppercase
        document.querySelectorAll('.airport-input').forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        });
        
        // Flight number auto-format
        const flightNumberInput = document.getElementById('flight-number');
        if (flightNumberInput) {
            flightNumberInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/\s+/g, '');
            });
        }
    }
    
    function handleTravelerSelection(e) {
        const btn = e.currentTarget;
        const travelerType = btn.dataset.traveler;
        
        // Update active state
        document.querySelectorAll('.traveler-option').forEach(b => {
            b.classList.remove('active');
        });
        btn.classList.add('active');
        
        // Show/hide friend selector
        const friendSelector = document.getElementById('friend-selector');
        if (travelerType === 'friend') {
            friendSelector.classList.remove('hidden');
            friendSelector.required = true;
            loadTripMembers();
        } else {
            friendSelector.classList.add('hidden');
            friendSelector.required = false;
        }
    }
    
    async function loadTripMembers() {
        // In production, fetch from API
        // For now, use sample data
        const members = [
            { id: 'user2', name: 'Jane Smith' },
            { id: 'user3', name: 'Bob Johnson' },
            { id: 'user4', name: 'Alice Williams' }
        ];
        
        const selector = document.getElementById('friend-selector');
        selector.innerHTML = '<option value="">Select a friend...</option>';
        
        members.forEach(member => {
            if (member.id !== currentUserId) {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = member.name;
                selector.appendChild(option);
            }
        });
    }
    
    async function loadFlights() {
        if (!currentTripId) {
            showEmptyState('no-trip');
            return;
        }
        
        showLoadingState();
        
        try {
            const response = await fetch(`/api/trips/${currentTripId}/flights?groupByDate=true`, {
                headers: {
                    'X-User-Id': currentUserId
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            flights = result.data;
            
            if (Object.keys(flights).length === 0) {
                showEmptyState();
            } else {
                renderFlights(flights);
            }
            
        } catch (error) {
            console.error('[FlightSystem] Failed to load flights:', error);
            showErrorState(error.message);
        }
    }
    
    function showLoadingState() {
        hideAllStates();
        document.getElementById('flights-loading')?.classList.remove('hidden');
        isLoading = true;
    }
    
    function showEmptyState(reason = 'no-flights') {
        hideAllStates();
        const emptyState = document.getElementById('flights-empty-state');
        if (emptyState) {
            emptyState.classList.remove('hidden');
            
            // Customize message based on reason
            if (reason === 'no-trip') {
                emptyState.querySelector('h3').textContent = 'Select a trip first';
                emptyState.querySelector('p').textContent = 'Create or join a trip to start adding flights';
            }
        }
        isLoading = false;
    }
    
    function showErrorState(message) {
        hideAllStates();
        const errorState = document.getElementById('flights-error');
        if (errorState) {
            errorState.classList.remove('hidden');
            const errorMsg = errorState.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.textContent = message || 'Please check your connection and try again';
            }
        }
        isLoading = false;
    }
    
    function hideAllStates() {
        ['flights-loading', 'flights-empty-state', 'flights-error', 'flights-list'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
    }
    
    function renderFlights(groupedFlights) {
        hideAllStates();
        const listElement = document.getElementById('flights-list');
        if (!listElement) return;
        
        listElement.classList.remove('hidden');
        listElement.innerHTML = '';
        
        // Sort dates
        const dates = Object.keys(groupedFlights).sort((a, b) => new Date(a) - new Date(b));
        
        dates.forEach(date => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'flight-date-group';
            
            const dateHeader = document.createElement('h3');
            dateHeader.className = 'flight-date-header';
            dateHeader.textContent = formatDateHeader(date);
            dateGroup.appendChild(dateHeader);
            
            const flightItems = document.createElement('div');
            flightItems.className = 'flight-items';
            
            groupedFlights[date].forEach(flight => {
                flightItems.appendChild(createFlightCard(flight));
            });
            
            dateGroup.appendChild(flightItems);
            listElement.appendChild(dateGroup);
        });
        
        // Show add button
        document.getElementById('flights-actions')?.classList.remove('hidden');
    }
    
    function createFlightCard(flight) {
        const card = document.createElement('div');
        card.className = 'flight-card';
        card.dataset.flightId = flight.id;
        
        const isOwner = flight.userId === currentUserId;
        const canEdit = isOwner || flight.friendId === currentUserId || 
                       (flight.guestUserIds && flight.guestUserIds.includes(currentUserId));
        
        card.innerHTML = `
            <div class="flight-card-header">
                <div class="flight-time">
                    ${flight.displayTime.time}
                </div>
                ${canEdit ? `
                    <div class="flight-actions">
                        <button class="btn-icon" onclick="window.flightSystem.editFlight('${flight.id}')" aria-label="Edit flight">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        ${isOwner ? `
                            <button class="btn-icon" onclick="window.flightSystem.deleteFlight('${flight.id}')" aria-label="Delete flight">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            
            <div class="flight-card-body">
                <div class="flight-route">
                    <span class="airport-code">${flight.departureAirport}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                    <span class="airport-code">${flight.arrivalAirport}</span>
                </div>
                
                <div class="flight-details">
                    <span class="airline-chip">${flight.airline}</span>
                    ${flight.flightNumber ? `<span class="flight-number">${flight.flightNumber}</span>` : ''}
                </div>
                
                <div class="flight-traveler">
                    <div class="traveler-avatar">
                        ${getTravelerInitials(flight.travelerName)}
                    </div>
                    <span class="traveler-name">${flight.travelerName}</span>
                    ${flight.isSharedFlight ? '<span class="shared-badge">Group</span>' : ''}
                </div>
                
                ${flight.notes ? `
                    <div class="flight-notes">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        ${flight.notes}
                    </div>
                ` : ''}
            </div>
        `;
        
        return card;
    }
    
    function formatDateHeader(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    }
    
    function getTravelerInitials(name) {
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }
    
    function openFlightModal(travelerType = 'me') {
        const modal = document.getElementById('flight-modal-enhanced');
        if (!modal) return;
        
        // Reset form
        document.getElementById('flight-form-enhanced')?.reset();
        editingFlight = null;
        
        // Set title
        document.getElementById('flight-modal-title').textContent = 'Add Flight';
        
        // Set traveler type
        if (travelerType === 'friend') {
            document.querySelector('[data-traveler="friend"]')?.click();
        } else {
            document.querySelector('[data-traveler="me"]')?.click();
        }
        
        // Show modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Focus first input
        setTimeout(() => {
            document.getElementById('flight-airline')?.focus();
        }, 100);
    }
    
    function closeModal() {
        const modal = document.getElementById('flight-modal-enhanced');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
    
    async function handleFlightSubmit(e) {
        e.preventDefault();
        
        // Clear previous errors
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
        });
        
        // Get form data
        const formData = {
            airline: document.getElementById('flight-airline').value.trim(),
            flightNumber: document.getElementById('flight-number').value.trim(),
            departureAirport: document.getElementById('departure-airport').value.trim(),
            arrivalAirport: document.getElementById('arrival-airport').value.trim(),
            arrivalDateTime: document.getElementById('arrival-datetime').value,
            confirmationNumber: document.getElementById('confirmation-number').value.trim(),
            terminal: document.getElementById('terminal').value.trim(),
            gate: document.getElementById('gate').value.trim(),
            seatNumber: document.getElementById('seat').value.trim(),
            notes: document.getElementById('flight-notes').value.trim()
        };
        
        // Determine traveler
        const isForFriend = document.querySelector('.traveler-option.active')?.dataset.traveler === 'friend';
        if (isForFriend) {
            formData.friendId = document.getElementById('friend-selector').value;
            if (!formData.friendId) {
                document.getElementById('friend-selector').focus();
                return;
            }
            // Get friend name
            const friendOption = document.querySelector(`#friend-selector option[value="${formData.friendId}"]`);
            formData.travelerName = friendOption?.textContent || 'Friend';
        } else {
            formData.travelerName = localStorage.getItem('userName') || 'Me';
        }
        
        // Validate
        if (!validateFlightForm(formData)) {
            return;
        }
        
        // Disable submit button
        const submitBtn = document.getElementById('save-flight-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        try {
            const url = editingFlight 
                ? `/api/flights/${editingFlight.id}`
                : `/api/trips/${currentTripId}/flights`;
                
            const method = editingFlight ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUserId
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            // Show success
            showToast(editingFlight ? 'Flight updated' : 'Flight added', 'success');
            
            // Close modal and reload
            closeModal();
            await loadFlights();
            
        } catch (error) {
            console.error('[FlightSystem] Failed to save flight:', error);
            showToast(error.message || 'Failed to save flight', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Flight';
        }
    }
    
    function validateFlightForm(data) {
        let isValid = true;
        
        // Validate airline
        if (!data.airline) {
            showFieldError('airline-error', 'Airline is required');
            isValid = false;
        }
        
        // Validate airports
        if (!data.departureAirport || !/^[A-Z]{3}$/.test(data.departureAirport)) {
            showFieldError('departure-error', 'Enter a valid 3-letter airport code');
            isValid = false;
        }
        
        if (!data.arrivalAirport || !/^[A-Z]{3}$/.test(data.arrivalAirport)) {
            showFieldError('arrival-error', 'Enter a valid 3-letter airport code');
            isValid = false;
        }
        
        if (data.departureAirport === data.arrivalAirport) {
            showFieldError('arrival-error', 'Airports must be different');
            isValid = false;
        }
        
        // Validate flight number if provided
        if (data.flightNumber && !/^[A-Z]{2,3}\d{1,5}$/.test(data.flightNumber)) {
            showFieldError('flight-number-error', 'Invalid format (e.g., AA1234)');
            isValid = false;
        }
        
        // Validate datetime
        if (!data.arrivalDateTime) {
            showFieldError('datetime-error', 'Arrival date and time are required');
            isValid = false;
        }
        
        return isValid;
    }
    
    function showFieldError(fieldId, message) {
        const errorEl = document.getElementById(fieldId);
        if (errorEl) {
            errorEl.textContent = message;
        }
    }
    
    async function editFlight(flightId) {
        const flight = findFlightById(flightId);
        if (!flight) return;
        
        editingFlight = flight;
        
        // Open modal with data
        openFlightModal();
        document.getElementById('flight-modal-title').textContent = 'Edit Flight';
        
        // Populate form
        document.getElementById('flight-airline').value = flight.airline;
        document.getElementById('flight-number').value = flight.flightNumber || '';
        document.getElementById('departure-airport').value = flight.departureAirport;
        document.getElementById('arrival-airport').value = flight.arrivalAirport;
        
        // Convert UTC to local datetime-local format
        const localDate = new Date(flight.arrivalDateTime);
        const dateStr = localDate.toISOString().slice(0, 16);
        document.getElementById('arrival-datetime').value = dateStr;
        
        document.getElementById('confirmation-number').value = flight.confirmationNumber || '';
        document.getElementById('terminal').value = flight.terminal || '';
        document.getElementById('gate').value = flight.gate || '';
        document.getElementById('seat').value = flight.seatNumber || '';
        document.getElementById('flight-notes').value = flight.notes || '';
        
        // Set traveler
        if (flight.friendId) {
            document.querySelector('[data-traveler="friend"]')?.click();
            await loadTripMembers();
            document.getElementById('friend-selector').value = flight.friendId;
        }
    }
    
    function findFlightById(flightId) {
        for (const date in flights) {
            const flight = flights[date].find(f => f.id === flightId);
            if (flight) return flight;
        }
        return null;
    }
    
    let flightToDelete = null;
    
    function deleteFlight(flightId) {
        flightToDelete = flightId;
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    function cancelDelete() {
        flightToDelete = null;
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    async function confirmDelete() {
        if (!flightToDelete) return;
        
        try {
            const response = await fetch(`/api/flights/${flightToDelete}`, {
                method: 'DELETE',
                headers: {
                    'X-User-Id': currentUserId
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            showToast('Flight deleted', 'success');
            cancelDelete();
            await loadFlights();
            
        } catch (error) {
            console.error('[FlightSystem] Failed to delete flight:', error);
            showToast('Failed to delete flight', 'error');
        }
    }
    
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function setupRealtimeUpdates() {
        if (typeof io === 'undefined' || window.location.hostname !== 'localhost') return;
        
        const socket = io();
        
        socket.on('flight-created', (flight) => {
            if (flight.tripId === currentTripId) {
                loadFlights();
            }
        });
        
        socket.on('flight-updated', (flight) => {
            if (flight.tripId === currentTripId) {
                loadFlights();
            }
        });
        
        socket.on('flight-deleted', (data) => {
            if (data.tripId === currentTripId) {
                loadFlights();
            }
        });
    }
    
    // Public API
    window.flightSystem = {
        init: initFlightSystem,
        loadFlights,
        openFlightModal,
        closeModal,
        editFlight,
        deleteFlight,
        cancelDelete,
        confirmDelete,
        retry: loadFlights
    };
    
})();