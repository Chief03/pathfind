// Stays Management
(function() {
    let stays = [];
    let currentTripId = null;
    let editingStayId = null;
    let socket = null;

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStays);
    } else {
        initStays();
    }

    function initStays() {
        console.log('[Stays] Initializing...');
        
        // Get elements
        const elements = {
            emptyState: document.getElementById('stay-empty-state'),
            staysList: document.getElementById('stays-list'),
            staysContent: document.getElementById('stays-content'),
            addEmptyBtn: document.getElementById('add-stay-empty-btn'),
            addBtn: document.getElementById('add-stay-btn'),
            modal: document.getElementById('stay-modal'),
            modalTitle: document.getElementById('stay-modal-title'),
            modalClose: document.querySelector('.stay-modal-close'),
            form: document.getElementById('stay-form'),
            
            // Form fields
            name: document.getElementById('accommodation-name'),
            type: document.getElementById('accommodation-type'),
            checkinDate: document.getElementById('checkin-date'),
            checkoutDate: document.getElementById('checkout-date'),
            address: document.getElementById('accommodation-address'),
            price: document.getElementById('accommodation-price'),
            confirmationNumber: document.getElementById('confirmation-number'),
            notes: document.getElementById('accommodation-notes'),
            
            cancelBtn: document.querySelector('#stay-form .btn-cancel'),
            saveBtn: document.querySelector('#stay-form .btn-save')
        };

        if (!elements.form) {
            console.warn('[Stays] Stay form not found');
            return;
        }

        // Get trip ID
        currentTripId = localStorage.getItem('currentTripId');
        
        // Load stays
        loadStays();
        
        // Set up event listeners
        setupEventListeners();
        
        // Connect to socket if available
        if (window.io && currentTripId && window.location.hostname === 'localhost') {
            setupSocket();
        }

        // Event Listeners
        function setupEventListeners() {
            // Add buttons
            if (elements.addEmptyBtn) {
                elements.addEmptyBtn.addEventListener('click', () => openModal());
            }
            
            if (elements.addBtn) {
                elements.addBtn.addEventListener('click', () => openModal());
            }
            
            // Modal controls
            if (elements.modalClose) {
                elements.modalClose.addEventListener('click', closeModal);
            }
            
            if (elements.cancelBtn) {
                elements.cancelBtn.addEventListener('click', closeModal);
            }
            
            // Form submission
            elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                saveStay();
            });
        }

        // Modal functions
        function openModal(stayId = null) {
            editingStayId = stayId;
            
            // Get trip dates for validation
            const tripData = localStorage.getItem('currentTrip');
            let tripStartDate = '';
            let tripEndDate = '';
            
            if (tripData) {
                const trip = JSON.parse(tripData);
                tripStartDate = trip.startDate || '';
                tripEndDate = trip.endDate || '';
                
                // Set min and max dates for date inputs to enforce trip date range
                if (tripStartDate) {
                    elements.checkinDate.min = tripStartDate;
                    elements.checkoutDate.min = tripStartDate;
                }
                if (tripEndDate) {
                    elements.checkinDate.max = tripEndDate;
                    elements.checkoutDate.max = tripEndDate;
                }
            }
            
            if (stayId) {
                // Editing existing stay
                const stay = stays.find(s => s.id === stayId);
                if (stay) {
                    elements.modalTitle.textContent = 'Edit Accommodation';
                    elements.name.value = stay.name;
                    elements.type.value = stay.type;
                    elements.checkinDate.value = stay.checkinDate;
                    elements.checkoutDate.value = stay.checkoutDate;
                    elements.address.value = stay.address;
                    elements.price.value = stay.price || '';
                    elements.confirmationNumber.value = stay.confirmationNumber || '';
                    elements.notes.value = stay.notes || '';
                }
            } else {
                // Adding new stay
                elements.modalTitle.textContent = 'Add Accommodation';
                elements.form.reset();
                
                // Set default dates based on trip dates
                if (tripStartDate) elements.checkinDate.value = tripStartDate;
                if (tripEndDate) elements.checkoutDate.value = tripEndDate;
            }
            
            // Update checkout date minimum when checkin date changes
            elements.checkinDate.addEventListener('change', function() {
                elements.checkoutDate.min = this.value;
                if (elements.checkoutDate.value && elements.checkoutDate.value < this.value) {
                    elements.checkoutDate.value = this.value;
                }
            });
            
            elements.modal.classList.remove('hidden');
        }

        function closeModal() {
            elements.modal.classList.add('hidden');
            editingStayId = null;
        }

        // Save stay
        async function saveStay() {
            const stayData = {
                id: editingStayId || 'stay-' + Date.now(),
                name: elements.name.value,
                type: elements.type.value,
                checkinDate: elements.checkinDate.value,
                checkoutDate: elements.checkoutDate.value,
                address: elements.address.value,
                price: elements.price.value || null,
                confirmationNumber: elements.confirmationNumber.value || null,
                notes: elements.notes.value || null,
                createdAt: new Date().toISOString()
            };

            if (editingStayId) {
                // Update existing stay
                const index = stays.findIndex(s => s.id === editingStayId);
                if (index !== -1) {
                    stays[index] = stayData;
                    // Track activity
                    if (window.addActivityToFeed) {
                        window.addActivityToFeed('✏️', `updated accommodation: ${stayData.name}`, null, 'update');
                    }
                }
            } else {
                // Add new stay
                stays.push(stayData);
                // Track activity
                if (window.addActivityToFeed) {
                    window.addActivityToFeed('🏨', `added accommodation: ${stayData.name}`, null, 'add');
                }
            }

            // Save to localStorage
            saveStaysToStorage();
            
            // Update UI
            renderStays();
            closeModal();
            
            // Update progress
            if (window.updateTripProgress) {
                const tripData = localStorage.getItem('currentTrip');
                if (tripData) {
                    window.updateTripProgress(JSON.parse(tripData));
                }
            }
            
            // Broadcast to other users
            if (socket && currentTripId) {
                socket.emit('stays-updated', {
                    tripId: currentTripId,
                    stays: stays
                });
            }
        }

        // Delete stay
        function deleteStay(stayId) {
            const stay = stays.find(s => s.id === stayId);
            if (confirm(`Are you sure you want to remove "${stay.name}"?`)) {
                stays = stays.filter(s => s.id !== stayId);
                renderStays();
                saveStaysToStorage();
                
                // Track activity
                if (window.addActivityToFeed) {
                    window.addActivityToFeed('🗑️', `removed accommodation: ${stay.name}`, null, 'remove');
                }
                
                // Update progress
                if (window.updateTripProgress) {
                    const tripData = localStorage.getItem('currentTrip');
                    if (tripData) {
                        window.updateTripProgress(JSON.parse(tripData));
                    }
                }
                
                // Broadcast deletion
                if (socket && currentTripId) {
                    socket.emit('stays-updated', {
                        tripId: currentTripId,
                        stays: stays
                    });
                }
            }
        }

        // Load stays from storage
        async function loadStays() {
            if (!currentTripId) return;
            
            try {
                const storedStays = localStorage.getItem(`stays-${currentTripId}`);
                if (storedStays) {
                    stays = JSON.parse(storedStays);
                    renderStays();
                }
                // Load suggestions after loading stays
                loadSuggestions();
            } catch (error) {
                console.error('[Stays] Error loading stays:', error);
            }
        }

        // Save stays to storage
        function saveStaysToStorage() {
            if (!currentTripId) return;
            
            try {
                localStorage.setItem(`stays-${currentTripId}`, JSON.stringify(stays));
            } catch (error) {
                console.error('[Stays] Error saving stays:', error);
            }
        }
        
        // Load suggested accommodations
        function loadSuggestions() {
            const tripData = localStorage.getItem('currentTrip');
            if (!tripData) return;
            
            const trip = JSON.parse(tripData);
            const destination = trip.location || 'your destination';
            
            // Popular hotel chains and accommodation types
            const suggestions = [
                { name: `Hilton ${destination}`, type: 'hotel', icon: '🏨' },
                { name: `Marriott Downtown`, type: 'hotel', icon: '🏨' },
                { name: `Holiday Inn Express`, type: 'hotel', icon: '🏨' },
                { name: `Hyatt Place`, type: 'hotel', icon: '🏨' },
                { name: `Best Western Plus`, type: 'hotel', icon: '🏨' },
                { name: `Cozy Airbnb`, type: 'airbnb', icon: '🏠' },
                { name: `Downtown Loft`, type: 'airbnb', icon: '🏠' },
                { name: `Local Hostel`, type: 'hostel', icon: '🏡' },
                { name: `Youth Hostel`, type: 'hostel', icon: '🏡' },
                { name: `Boutique Hotel`, type: 'hotel', icon: '✨' },
                { name: `Resort & Spa`, type: 'hotel', icon: '🌴' },
                { name: `Budget Inn`, type: 'hotel', icon: '💰' }
            ];
            
            const suggestionsGrid = document.getElementById('stay-suggestions-grid');
            if (!suggestionsGrid) return;
            
            suggestionsGrid.innerHTML = '';
            
            // Take random 6 suggestions
            const shuffled = suggestions.sort(() => 0.5 - Math.random());
            const selectedSuggestions = shuffled.slice(0, 6);
            
            selectedSuggestions.forEach(suggestion => {
                const suggestionCard = document.createElement('div');
                suggestionCard.className = 'stay-suggestion-card';
                suggestionCard.innerHTML = `
                    <span class="suggestion-icon">${suggestion.icon}</span>
                    <span class="suggestion-name">${suggestion.name}</span>
                `;
                
                suggestionCard.addEventListener('click', () => {
                    // Open modal with pre-filled data
                    openModal();
                    elements.name.value = suggestion.name;
                    elements.type.value = suggestion.type;
                    
                    // Pre-fill dates from trip
                    if (trip.startDate) elements.checkinDate.value = trip.startDate;
                    if (trip.endDate) elements.checkoutDate.value = trip.endDate;
                    
                    // Focus on address field since name and type are filled
                    setTimeout(() => elements.address.focus(), 100);
                });
                
                suggestionsGrid.appendChild(suggestionCard);
            });
        }

        // Render stays
        function renderStays() {
            if (!elements.staysContent) return;
            
            if (stays.length === 0) {
                // Show empty state
                elements.emptyState.classList.remove('hidden');
                elements.staysList.classList.add('hidden');
            } else {
                // Show stays list
                elements.emptyState.classList.add('hidden');
                elements.staysList.classList.remove('hidden');
                
                // Clear content
                elements.staysContent.innerHTML = '';
                
                // Sort stays by check-in date
                const sortedStays = [...stays].sort((a, b) => 
                    new Date(a.checkinDate) - new Date(b.checkinDate)
                );
                
                // Render each stay
                sortedStays.forEach(stay => {
                    const stayElement = createStayElement(stay);
                    elements.staysContent.appendChild(stayElement);
                });
            }
        }

        // Create stay element
        function createStayElement(stay) {
            const div = document.createElement('div');
            div.className = 'stay-item';
            div.dataset.stayId = stay.id;
            
            const checkinDate = new Date(stay.checkinDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            const checkoutDate = new Date(stay.checkoutDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            
            // Calculate number of nights
            const nights = Math.ceil((new Date(stay.checkoutDate) - new Date(stay.checkinDate)) / (1000 * 60 * 60 * 24));
            
            div.innerHTML = `
                <button class="stay-delete-btn" data-stay-id="${stay.id}" aria-label="Delete accommodation">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
                <div class="stay-header-info">
                    <div>
                        <div class="stay-name">${stay.name}</div>
                        <div class="stay-dates">
                            📅 ${checkinDate} - ${checkoutDate} (${nights} ${nights === 1 ? 'night' : 'nights'})
                        </div>
                        <div class="stay-address">📍 ${stay.address}</div>
                    </div>
                    <span class="stay-type-badge">${stay.type.replace('-', ' ')}</span>
                </div>
                ${(stay.price || stay.confirmationNumber) ? `
                    <div class="stay-details">
                        ${stay.price ? `
                            <div class="stay-detail-item">
                                <span class="stay-detail-label">Total Price</span>
                                <span class="stay-detail-value">$${stay.price}</span>
                            </div>
                        ` : ''}
                        ${stay.confirmationNumber ? `
                            <div class="stay-detail-item">
                                <span class="stay-detail-label">Confirmation</span>
                                <span class="stay-detail-value">${stay.confirmationNumber}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                ${stay.notes ? `
                    <div class="stay-notes">
                        <small>📝 ${stay.notes}</small>
                    </div>
                ` : ''}
            `;
            
            // Add click handlers
            div.addEventListener('click', (e) => {
                // Don't open modal if delete button was clicked
                if (!e.target.closest('.stay-delete-btn')) {
                    openModal(stay.id);
                }
            });
            
            // Add delete button handler
            const deleteBtn = div.querySelector('.stay-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteStay(stay.id);
                });
            }
            
            return div;
        }

        // Socket setup
        function setupSocket() {
            socket = (window.io && window.location.hostname === 'localhost') ? window.io() : null;
            if (!socket) return;
            
            socket.on('stays-updated', (data) => {
                if (data.tripId === currentTripId) {
                    stays = data.stays;
                    renderStays();
                    saveStaysToStorage();
                }
            });
        }

        // Public API
        window.staysManager = {
            loadTrip: function(tripId) {
                currentTripId = tripId;
                loadStays();
            },
            refresh: function() {
                renderStays();
            }
        };
    }
})();