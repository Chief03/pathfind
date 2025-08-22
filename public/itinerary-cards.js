'use strict';

(function() {
    let cards = [];
    let currentTripId = null;
    let editingCardId = null;
    let socket = null;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initItineraryCards);
    } else {
        initItineraryCards();
    }
    
    function initItineraryCards() {
        console.log('[ItineraryCards] Initializing...');
        
        // Get elements
        const elements = {
            container: document.getElementById('cards-container'),
            addBtn: document.getElementById('add-card-btn'),
            modal: document.getElementById('card-modal'),
            modalTitle: document.getElementById('card-modal-title'),
            modalClose: document.querySelector('.card-modal-close'),
            cancelBtn: document.querySelector('.btn-cancel'),
            form: document.getElementById('card-form'),
            locationInput: document.getElementById('card-location'),
            dateInput: document.getElementById('card-date'),
            timeInput: document.getElementById('card-time'),
            priceInput: document.getElementById('card-price'),
            descriptionInput: document.getElementById('card-description')
        };
        
        if (!elements.container || !elements.addBtn) {
            console.warn('[ItineraryCards] Required elements not found');
            return;
        }
        
        // Setup socket connection if available
        if (typeof io !== 'undefined') {
            socket = window.socket || io();
            setupSocketListeners();
        }
        
        // Load saved cards
        loadCards();
        
        // Load suggestions
        loadSuggestions();
        
        // Add button handler
        elements.addBtn.addEventListener('click', () => {
            openCardModal();
        });
        
        // Modal handlers
        if (elements.modalClose) {
            elements.modalClose.addEventListener('click', closeCardModal);
        }
        
        if (elements.cancelBtn) {
            elements.cancelBtn.addEventListener('click', closeCardModal);
        }
        
        // Form submission
        if (elements.form) {
            elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                saveCard();
            });
        }
        
        // Auto-update time when date changes will be set up after functions are defined
        
        // Close modal on backdrop click
        if (elements.modal) {
            elements.modal.addEventListener('click', (e) => {
                if (e.target === elements.modal) {
                    closeCardModal();
                }
            });
        }
        
        // Card modal functions
        function openCardModal(cardId = null) {
            editingCardId = cardId;
            
            // Get trip data for date restrictions
            const tripData = JSON.parse(localStorage.getItem('currentTrip') || '{}');
            
            // Set date input min and max based on trip dates
            if (tripData.startDate && tripData.endDate) {
                elements.dateInput.min = tripData.startDate;
                elements.dateInput.max = tripData.endDate;
            }
            
            if (cardId) {
                // Editing existing card
                const card = cards.find(c => c.id === cardId);
                if (card) {
                    elements.modalTitle.textContent = 'Edit Event';
                    elements.locationInput.value = card.location;
                    elements.dateInput.value = card.date;
                    elements.timeInput.value = card.time;
                    elements.priceInput.value = card.price || '';
                    elements.descriptionInput.value = card.description || '';
                }
            } else {
                // Adding new card
                elements.modalTitle.textContent = 'Add Event';
                elements.form.reset();
                
                // Set default date to first day of trip or today
                const today = new Date().toISOString().split('T')[0];
                const defaultDate = tripData.startDate || today;
                elements.dateInput.value = defaultDate;
                
                // Make sure we're not using dates from 2001 or other wrong years
                if (elements.dateInput.value < '2024-01-01') {
                    elements.dateInput.value = today;
                }
                
                // Auto-generate time based on existing cards
                const generatedTime = generateNextEventTime();
                elements.timeInput.value = generatedTime;
            }
            
            elements.modal.classList.remove('hidden');
        }
        
        // Generate smart time for next event
        function generateNextEventTime() {
            // Get all cards for the same date
            const tripData = JSON.parse(localStorage.getItem('currentTrip') || '{}');
            const selectedDate = elements.dateInput.value || tripData.startDate;
            const sameDayCards = cards.filter(c => c.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
            
            if (sameDayCards.length === 0) {
                // First event of the day - start at 9 AM
                return '09:00';
            }
            
            // Find the latest event time
            const lastCard = sameDayCards[sameDayCards.length - 1];
            const [hours] = lastCard.time.split(':');
            let newHours = parseInt(hours);
            
            // Calculate time gap based on remaining day
            const remainingHours = 21 - newHours; // Until 9 PM
            const timeGap = Math.max(1, Math.min(3, remainingHours));
            
            newHours += timeGap;
            
            // Don't go past 9 PM
            if (newHours > 21) {
                // Try to find a gap in the schedule
                for (let i = 0; i < sameDayCards.length - 1; i++) {
                    const currentTime = parseInt(sameDayCards[i].time.split(':')[0]);
                    const nextTime = parseInt(sameDayCards[i + 1].time.split(':')[0]);
                    if (nextTime - currentTime > 1) {
                        // Found a gap, place event in between
                        newHours = currentTime + 1;
                        break;
                    }
                }
                // If still too late, cap at 9 PM
                if (newHours > 21) newHours = 21;
            }
            
            return `${String(newHours).padStart(2, '0')}:00`;
        }
        
        // Setup date change handler to auto-update time
        if (elements.dateInput) {
            elements.dateInput.addEventListener('change', () => {
                if (!editingCardId) {
                    // Only auto-generate for new cards
                    const generatedTime = generateNextEventTime();
                    elements.timeInput.value = generatedTime;
                }
            });
        }
        
        function closeCardModal() {
            elements.modal.classList.add('hidden');
            elements.form.reset();
            editingCardId = null;
        }
        
        function saveCard() {
            const cardData = {
                id: editingCardId || generateId(),
                location: elements.locationInput.value,
                date: elements.dateInput.value,
                time: elements.timeInput.value || generateNextEventTime(),
                price: parseFloat(elements.priceInput.value) || 0,
                description: elements.descriptionInput.value,
                author: getCurrentUser(),
                timestamp: new Date().toISOString()
            };
            
            if (editingCardId) {
                // Update existing card
                const index = cards.findIndex(c => c.id === editingCardId);
                if (index !== -1) {
                    cards[index] = { ...cards[index], ...cardData };
                }
            } else {
                // Add new card
                cards.push(cardData);
            }
            
            // Sort cards by date and time
            sortCards();
            
            // Render cards
            renderCards();
            
            // Save to localStorage
            saveCardsToStorage();
            
            // Broadcast to other users
            if (socket && currentTripId) {
                socket.emit('cards-updated', {
                    tripId: currentTripId,
                    cards: cards
                });
            }
            
            closeCardModal();
        }
        
        function deleteCard(cardId) {
            if (confirm('Are you sure you want to delete this event?')) {
                cards = cards.filter(c => c.id !== cardId);
                renderCards();
                saveCardsToStorage();
                
                // Broadcast deletion
                if (socket && currentTripId) {
                    socket.emit('cards-updated', {
                        tripId: currentTripId,
                        cards: cards
                    });
                }
            }
        }
        
        function sortCards() {
            cards.sort((a, b) => {
                // First sort by date
                const dateCompare = a.date.localeCompare(b.date);
                if (dateCompare !== 0) return dateCompare;
                
                // Then by time if dates are the same
                return a.time.localeCompare(b.time);
            });
        }
        
        // Auto-adjust times to make chronological sense
        function autoAdjustTimes() {
            let timesChanged = false;
            
            // Group cards by date
            const cardsByDate = {};
            cards.forEach(card => {
                if (!cardsByDate[card.date]) {
                    cardsByDate[card.date] = [];
                }
                cardsByDate[card.date].push(card);
            });
            
            // Adjust times for each date
            Object.keys(cardsByDate).forEach(date => {
                const dayCards = cardsByDate[date];
                const numEvents = dayCards.length;
                
                // Define smart time slots based on number of events
                let timeSlots = [];
                
                if (numEvents === 1) {
                    timeSlots = ['12:00']; // Single event at noon
                } else if (numEvents === 2) {
                    timeSlots = ['12:00', '15:00']; // Noon and 3 PM
                } else if (numEvents === 3) {
                    timeSlots = ['10:00', '14:00', '18:00']; // Morning, afternoon, evening
                } else if (numEvents === 4) {
                    timeSlots = ['10:00', '13:00', '16:00', '19:00'];
                } else if (numEvents === 5) {
                    timeSlots = ['09:00', '11:30', '14:00', '16:30', '19:00'];
                } else {
                    // For more than 5 events, distribute evenly
                    const startHour = 9;
                    const endHour = 20;
                    const totalMinutes = (endHour - startHour) * 60;
                    const gap = Math.floor(totalMinutes / (numEvents + 1));
                    
                    for (let i = 0; i < numEvents; i++) {
                        const minutes = (i + 1) * gap;
                        const hours = Math.floor(minutes / 60) + startHour;
                        const mins = minutes % 60;
                        timeSlots.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
                    }
                }
                
                // Apply time slots to cards
                dayCards.forEach((card, index) => {
                    const newTime = timeSlots[index];
                    
                    if (card.time !== newTime) {
                        card.time = newTime;
                        timesChanged = true;
                        console.log(`[Itinerary] Auto-adjusted time for "${card.location}" to ${newTime}`);
                    }
                });
            });
            
            // Show notification if times were adjusted
            if (timesChanged) {
                showTimeAdjustmentNotification();
            }
            
            // Re-sort by the new times
            sortCards();
        }
        
        // Show visual feedback when times are adjusted
        function showTimeAdjustmentNotification() {
            // Add animation class to cards
            setTimeout(() => {
                document.querySelectorAll('.event-card').forEach(card => {
                    card.classList.add('time-adjusted');
                    setTimeout(() => {
                        card.classList.remove('time-adjusted');
                    }, 500);
                });
            }, 100);
            
            // Show a subtle notification
            const notification = document.createElement('div');
            notification.className = 'time-adjustment-notice';
            notification.textContent = 'Times auto-adjusted for logical flow';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--accent-gold);
                color: var(--primary-navy);
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000);
        }
        
        function renderCards() {
            elements.container.innerHTML = '';
            
            cards.forEach((card, index) => {
                const cardEl = createCardElement(card, index);
                elements.container.appendChild(cardEl);
            });
            
            // Setup drag and drop
            setupDragAndDrop();
        }
        
        function createCardElement(card, index) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'event-card';
            cardDiv.dataset.cardId = card.id;
            cardDiv.dataset.index = index;
            cardDiv.draggable = true;
            
            // Format date and time
            const date = new Date(card.date);
            const dateStr = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            
            // Format time
            const [hours, minutes] = card.time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const timeStr = `${displayHour}:${minutes} ${ampm}`;
            
            // Format price
            const priceStr = card.price > 0 ? `$${card.price.toFixed(2)}` : 'Free';
            
            cardDiv.innerHTML = `
                <button class="card-delete-btn" data-card-id="${card.id}" aria-label="Delete event">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
                <div class="card-content">
                    <div class="card-header">
                        <div class="card-time">
                            <span class="card-date">${dateStr}</span>
                            <span class="card-hour">${timeStr}</span>
                        </div>
                    </div>
                    <div class="card-location">${escapeHtml(card.location)}</div>
                    ${card.description ? `<div class="card-description">${escapeHtml(card.description)}</div>` : ''}
                    <div class="card-footer">
                        <div class="card-price ${card.price === 0 ? 'free' : ''}">${priceStr}</div>
                        <div class="card-author">by ${escapeHtml(card.author)}</div>
                    </div>
                </div>
            `;
            
            // Make card clickable for editing
            const cardContent = cardDiv.querySelector('.card-content');
            cardContent.addEventListener('click', (e) => {
                e.stopPropagation();
                openCardModal(card.id);
            });
            
            // Delete button
            const deleteBtn = cardDiv.querySelector('.card-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                deleteCard(card.id);
            });
            
            return cardDiv;
        }
        
        function setupDragAndDrop() {
            const cardElements = elements.container.querySelectorAll('.event-card');
            let draggedCard = null;
            let draggedIndex = null;
            
            cardElements.forEach(card => {
                // Drag start
                card.addEventListener('dragstart', (e) => {
                    draggedCard = card;
                    draggedIndex = parseInt(card.dataset.index);
                    card.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                });
                
                // Drag end
                card.addEventListener('dragend', () => {
                    card.classList.remove('dragging');
                    draggedCard = null;
                    draggedIndex = null;
                });
                
                // Drag over
                card.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (card !== draggedCard) {
                        card.classList.add('drag-over');
                    }
                });
                
                // Drag leave
                card.addEventListener('dragleave', () => {
                    card.classList.remove('drag-over');
                });
                
                // Drop
                card.addEventListener('drop', (e) => {
                    e.preventDefault();
                    card.classList.remove('drag-over');
                    
                    if (draggedCard && card !== draggedCard) {
                        const targetIndex = parseInt(card.dataset.index);
                        
                        // Reorder cards array
                        const draggedCardData = cards[draggedIndex];
                        cards.splice(draggedIndex, 1);
                        
                        // Insert at new position
                        if (draggedIndex < targetIndex) {
                            cards.splice(targetIndex - 1, 0, draggedCardData);
                        } else {
                            cards.splice(targetIndex, 0, draggedCardData);
                        }
                        
                        // Auto-adjust times after reordering
                        autoAdjustTimes();
                        
                        // Re-render
                        renderCards();
                        saveCardsToStorage();
                        
                        // Broadcast reorder
                        if (socket && currentTripId) {
                            socket.emit('cards-updated', {
                                tripId: currentTripId,
                                cards: cards
                            });
                        }
                    }
                });
            });
        }
        
        // Socket listeners
        function setupSocketListeners() {
            if (!socket) return;
            
            socket.on('cards-updated', (data) => {
                if (data.tripId === currentTripId) {
                    cards = data.cards;
                    renderCards();
                    saveCardsToStorage();
                }
            });
        }
        
        // Storage functions
        function saveCardsToStorage() {
            if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                const key = currentTripId ? `cards-${currentTripId}` : 'cards-temp';
                try {
                    localStorage.setItem(key, JSON.stringify(cards));
                } catch (error) {
                    console.error('[ItineraryCards] Failed to save to localStorage:', error);
                }
            }
        }
        
        function loadCards() {
            if (typeof window === 'undefined') return;
            
            // Get trip ID from multiple sources
            const urlParams = new URLSearchParams(window.location.search);
            currentTripId = urlParams.get('tripId');
            
            if (!currentTripId && typeof localStorage !== 'undefined') {
                const tripData = JSON.parse(localStorage.getItem('currentTrip') || '{}');
                currentTripId = tripData.id || tripData.tripId || localStorage.getItem('currentTripId');
                
                // If no trip ID found, create a temporary one
                if (!currentTripId) {
                    currentTripId = 'temp-' + Date.now();
                    localStorage.setItem('currentTripId', currentTripId);
                    console.log('[ItineraryCards] Created temporary trip ID:', currentTripId);
                }
            }
            
            console.log('[ItineraryCards] Using trip ID:', currentTripId);
            
            const key = currentTripId ? `cards-${currentTripId}` : 'cards-temp';
            const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
            
            if (saved) {
                try {
                    cards = JSON.parse(saved);
                    renderCards();
                } catch (e) {
                    console.error('[ItineraryCards] Error loading cards:', e);
                    cards = [];
                }
            }
        }
        
        // Utility functions
        function generateId() {
            return 'card-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }
        
        function getCurrentUser() {
            // Get from auth or use placeholder
            return localStorage.getItem('userName') || 'Guest';
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Close dropdowns when clicking outside (if we still have them)
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.card-menu')) {
                const menus = document.querySelectorAll('.card-menu-dropdown');
                if (menus) {
                    menus.forEach(menu => menu.classList.add('hidden'));
                }
            }
        });
        
        // Export for external use - moved inside initItineraryCards so it has access to all functions
        window.itineraryCards = {
            loadTrip: function(tripId) {
                currentTripId = tripId;
                loadCards();
            },
            getCards: function() {
                return cards;
            },
            addCard: function(cardData) {
                try {
                    if (!cardData) {
                        console.error('[ItineraryCards] No card data provided');
                        return false;
                    }
                    
                    // Get trip data for correct date
                    const tripData = JSON.parse(localStorage.getItem('currentTrip') || '{}');
                    const today = new Date().toISOString().split('T')[0];
                    const defaultDate = cardData.date || tripData.startDate || today;
                    
                    const newCard = {
                        id: cardData.id || `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        location: cardData.location || cardData.title || 'New Activity',
                        date: defaultDate,
                        time: cardData.time || '12:00',
                        price: cardData.price || 0,
                        description: cardData.description || '',
                        category: cardData.category || 'Activity',
                        author: cardData.author || 'Added from Activities',
                        timestamp: cardData.timestamp || new Date().toISOString()
                    };
                    
                    // Add to cards array
                    cards.push(newCard);
                    console.log('[ItineraryCards] Card added to array. Total cards:', cards.length);
                    
                    // Sort cards
                    sortCards();
                    
                    // Save and render
                    saveCardsToStorage();
                    renderCards();
                    
                    console.log('[ItineraryCards] Successfully added card:', newCard);
                    return true;
                } catch (error) {
                    console.error('[ItineraryCards] Error adding card:', error);
                    return false;
                }
            },
            refreshView: function() {
                renderCards();
            }
        };
        
        console.log('[ItineraryCards] Initialization complete');
    }
    
    // Load and display suggestions
    function loadSuggestions() {
        const tripData = JSON.parse(localStorage.getItem('currentTrip') || '{}');
        const destination = tripData.destination || 'Paris';
        
        // Suggestions based on destination (you can expand this)
        const suggestions = getSuggestionsForDestination(destination);
        
        const container = document.getElementById('suggestions-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const suggestionCard = document.createElement('div');
            suggestionCard.className = 'suggestion-card';
            
            suggestionCard.innerHTML = `
                <button class="add-btn" aria-label="Add suggestion">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
                <div class="suggestion-title">${suggestion.title}</div>
                <div class="suggestion-time">Suggested: ${suggestion.time}</div>
                <div class="suggestion-price">${suggestion.price > 0 ? `$${suggestion.price}` : 'Free'}</div>
            `;
            
            // Add click handler
            const addBtn = suggestionCard.querySelector('.add-btn');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addSuggestionToItinerary(suggestion);
                suggestionCard.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    suggestionCard.remove();
                }, 300);
            });
            
            container.appendChild(suggestionCard);
        });
    }
    
    // Get suggestions based on destination
    function getSuggestionsForDestination(destination) {
        const commonSuggestions = {
            'Paris': [
                { title: 'Eiffel Tower Visit', time: '10:00', price: 25, description: 'Iconic landmark visit' },
                { title: 'Louvre Museum', time: '14:00', price: 17, description: 'World-famous art museum' },
                { title: 'Seine River Cruise', time: '18:00', price: 15, description: 'Scenic boat ride' },
                { title: 'Montmartre Walking Tour', time: '16:00', price: 0, description: 'Artistic neighborhood exploration' },
                { title: 'Versailles Day Trip', time: '09:00', price: 20, description: 'Royal palace visit' }
            ],
            'default': [
                { title: 'City Walking Tour', time: '10:00', price: 0, description: 'Explore the city center' },
                { title: 'Local Food Market', time: '11:30', price: 0, description: 'Sample local cuisine' },
                { title: 'Museum Visit', time: '14:00', price: 15, description: 'Cultural exploration' },
                { title: 'Sunset Viewpoint', time: '18:00', price: 0, description: 'Scenic views' },
                { title: 'Evening Entertainment', time: '20:00', price: 30, description: 'Local shows or events' }
            ]
        };
        
        // Return suggestions for the destination or default
        const key = Object.keys(commonSuggestions).find(k => 
            destination.toLowerCase().includes(k.toLowerCase())
        );
        
        return commonSuggestions[key] || commonSuggestions.default;
    }
    
    // Add suggestion to itinerary
    function addSuggestionToItinerary(suggestion) {
        const tripData = JSON.parse(localStorage.getItem('currentTrip') || '{}');
        const selectedDate = tripData.startDate || new Date().toISOString().split('T')[0];
        
        const newCard = {
            id: generateId(),
            location: suggestion.title,
            date: selectedDate,
            time: suggestion.time,
            price: suggestion.price,
            description: suggestion.description,
            author: getCurrentUser(),
            timestamp: new Date().toISOString()
        };
        
        cards.push(newCard);
        sortCards();
        autoAdjustTimes(); // Auto-adjust times after adding
        renderCards();
        saveCardsToStorage();
        
        // Broadcast update
        if (socket && currentTripId) {
            socket.emit('cards-updated', {
                tripId: currentTripId,
                cards: cards
            });
        }
        
        // Reload suggestions to remove the added one or show new ones
        setTimeout(loadSuggestions, 500);
    }
})();