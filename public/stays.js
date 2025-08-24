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
        if (window.io && currentTripId) {
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
                const tripData = localStorage.getItem('currentTrip');
                if (tripData) {
                    const trip = JSON.parse(tripData);
                    if (trip.startDate) elements.checkinDate.value = trip.startDate;
                    if (trip.endDate) elements.checkoutDate.value = trip.endDate;
                }
            }
            
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
                        window.addActivityToFeed('✏️', `Updated accommodation: ${stayData.name}`);
                    }
                }
            } else {
                // Add new stay
                stays.push(stayData);
                // Track activity
                if (window.addActivityToFeed) {
                    window.addActivityToFeed('🏨', `Added accommodation: ${stayData.name}`);
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
                    window.addActivityToFeed('🗑️', `Removed accommodation: ${stay.name}`);
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
            div.addEventListener('click', () => openModal(stay.id));
            
            return div;
        }

        // Socket setup
        function setupSocket() {
            socket = window.io ? window.io() : null;
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