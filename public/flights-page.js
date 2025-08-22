'use strict';

class FlightsPage {
    constructor() {
        this.flights = [];
        this.currentTripId = null;
        this.editingFlightId = null;
        this.selectedFlightId = null;
        this.socket = null;
        this.state = 'loading'; // loading, empty, list
        this.elements = {};
        
        // Only initialize if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        console.log('[FlightsPage] Initializing...');
        console.log('[FlightsPage] Container found:', !!document.getElementById('flights-tab'));
        
        // Cache DOM elements
        this.cacheElements();
        
        // Setup socket if available
        if (typeof io !== 'undefined') {
            this.socket = window.socket || io();
            this.setupSocketListeners();
        }
        
        // Get trip ID from multiple possible sources
        if (typeof localStorage !== 'undefined') {
            const tripData = JSON.parse(localStorage.getItem('currentTrip') || '{}');
            this.currentTripId = tripData.id || tripData.tripId || localStorage.getItem('currentTripId');
            
            // If no trip ID found, create a temporary one
            if (!this.currentTripId) {
                this.currentTripId = 'temp-' + Date.now();
                localStorage.setItem('currentTripId', this.currentTripId);
                console.log('[FlightsPage] Created temporary trip ID:', this.currentTripId);
            }
        }
        
        console.log('[FlightsPage] Using trip ID:', this.currentTripId);
        
        // Load flights
        this.loadFlights();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Auto-refresh on tab focus
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('[FlightsPage] Tab focused, revalidating...');
                this.loadFlights();
            }
        });
    }
    
    cacheElements() {
        this.elements = {
            container: document.getElementById('flights-tab'),
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
            arrivalAirportCode: document.getElementById('arrival-airport-code'),
            arrivalAirportName: document.getElementById('arrival-airport-name'),
            arrivalCity: document.getElementById('arrival-city'),
            arrivalTimeISO: document.getElementById('arrival-time'),
            flightNotes: document.getElementById('flight-notes')
        };
    }
    
    setupEventListeners() {
        // Add flight buttons
        if (this.elements.addEmptyBtn) {
            this.elements.addEmptyBtn.addEventListener('click', () => this.openFlightModal());
        }
        
        if (this.elements.addBtn) {
            this.elements.addBtn.addEventListener('click', () => this.openFlightModal());
        }
        
        // Modal controls
        if (this.elements.modalClose) {
            this.elements.modalClose.addEventListener('click', () => this.closeFlightModal());
        }
        
        if (this.elements.cancelBtn) {
            this.elements.cancelBtn.addEventListener('click', () => this.closeFlightModal());
        }
        
        // Form submission
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveFlight();
            });
        }
        
        // Modal backdrop click
        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target === this.elements.modal) {
                    this.closeFlightModal();
                }
            });
        }
        
        // Drawer controls
        if (this.elements.drawerClose) {
            this.elements.drawerClose.addEventListener('click', () => this.closeDrawer());
        }
        
        if (this.elements.editBtn) {
            this.elements.editBtn.addEventListener('click', () => {
                if (this.selectedFlightId) {
                    this.closeDrawer();
                    this.openFlightModal(this.selectedFlightId);
                }
            });
        }
        
        if (this.elements.deleteBtn) {
            this.elements.deleteBtn.addEventListener('click', () => {
                if (this.selectedFlightId) {
                    this.deleteFlight(this.selectedFlightId);
                }
            });
        }
        
        // Auto-uppercase airport code
        if (this.elements.arrivalAirportCode) {
            this.elements.arrivalAirportCode.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
    }
    
    setState(newState) {
        this.state = newState;
        this.render();
    }
    
    async loadFlights() {
        if (!this.currentTripId) {
            this.setState('empty');
            return;
        }
        
        this.setState('loading');
        
        try {
            const response = await fetch(`/api/trips/${this.currentTripId}/flights`);
            if (response.ok) {
                this.flights = await response.json();
                this.setState(this.flights.length === 0 ? 'empty' : 'list');
            } else {
                throw new Error('Failed to load flights');
            }
        } catch (error) {
            console.error('[FlightsPage] Load error:', error);
            this.setState('empty');
        }
    }
    
    render() {
        if (!this.elements.container) return;
        
        // Clear content
        this.elements.container.innerHTML = '';
        
        switch (this.state) {
            case 'loading':
                this.renderLoading();
                break;
            case 'empty':
                this.renderEmptyState();
                break;
            case 'list':
                this.renderFlightsList();
                break;
        }
    }
    
    renderLoading() {
        const html = `
            <div class="flights-container">
                <div class="flights-loading" aria-busy="true">
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                </div>
            </div>
        `;
        this.elements.container.innerHTML = html;
    }
    
    renderEmptyState() {
        const html = `
            <div class="flights-container">
                <div class="flights-empty-state">
                    <div class="empty-icon">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                            <path d="m2 21 1.5-3.5L21 3.5l-4.5 4.5L4 14l-2 7z"></path>
                            <path d="m9 12 3 3"></path>
                            <path d="M12 3.5 9 12l3 3L21 3.5"></path>
                        </svg>
                    </div>
                    <h2 class="empty-title">No flight info yet</h2>
                    <p class="empty-subtitle">Add your arrival details so friends can coordinate pickups at the destination airport</p>
                    <button class="primary-btn add-flight-btn">Add Arrival Info</button>
                </div>
            </div>
        `;
        this.elements.container.innerHTML = html;
        
        // Re-attach event listener for the new button
        const addBtn = this.elements.container.querySelector('.add-flight-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openFlightModal());
        }
    }
    
    renderFlightsList() {
        // Group flights by arrival date
        const groupedFlights = this.groupFlightsByDate(this.flights);
        
        const html = `
            <div class="flights-container">
                <div class="flights-header">
                    <h3>Flight Information</h3>
                    <button class="add-flight-btn secondary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Flight
                    </button>
                </div>
                <div class="flights-list">
                    ${Object.entries(groupedFlights).map(([date, flights]) => `
                        <div class="flight-date-group">
                            <h4 class="flight-date-header">${this.formatDateHeader(date)}</h4>
                            <div class="flight-items">
                                ${flights.map(flight => this.renderFlightItem(flight)).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.elements.container.innerHTML = html;
        
        // Re-attach event listeners
        const addBtn = this.elements.container.querySelector('.add-flight-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openFlightModal());
        }
        
        // Attach click handlers to flight items
        const flightItems = this.elements.container.querySelectorAll('.flight-item');
        flightItems.forEach(item => {
            item.addEventListener('click', () => {
                const flightId = item.dataset.flightId;
                this.showFlightDetails(flightId);
            });
        });
        
        // Attach handlers to edit/delete buttons
        const editBtns = this.elements.container.querySelectorAll('.flight-edit-btn');
        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const flightId = btn.dataset.flightId;
                this.openFlightModal(flightId);
            });
        });
        
        const deleteBtns = this.elements.container.querySelectorAll('.flight-delete-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const flightId = btn.dataset.flightId;
                this.deleteFlight(flightId);
            });
        });
    }
    
    renderFlightItem(flight) {
        // Convert to destination timezone
        const arrivalTime = this.formatArrivalTime(flight.arrivalTimeISO);
        
        // Get traveler initials
        const initials = flight.travelerName
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        
        return `
            <div class="flight-item" data-flight-id="${flight.id}">
                <div class="flight-item-left">
                    <div class="flight-avatar">${initials}</div>
                    <div class="flight-info">
                        <div class="flight-traveler">${this.escapeHtml(flight.travelerName)}</div>
                        <div class="flight-details">
                            ${this.escapeHtml(flight.airline)} ${this.escapeHtml(flight.flightNumber)} • 
                            ${this.escapeHtml(flight.arrivalAirportCode)}
                        </div>
                    </div>
                </div>
                <div class="flight-item-right">
                    <div class="flight-arrival-time">${arrivalTime}</div>
                    <div class="flight-actions">
                        <button class="flight-edit-btn" data-flight-id="${flight.id}" aria-label="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="flight-delete-btn" data-flight-id="${flight.id}" aria-label="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    groupFlightsByDate(flights) {
        const grouped = {};
        
        // Sort flights by arrival time
        const sorted = [...flights].sort((a, b) => 
            new Date(a.arrivalTimeISO) - new Date(b.arrivalTimeISO)
        );
        
        // Group by date
        sorted.forEach(flight => {
            const date = new Date(flight.arrivalTimeISO).toISOString().split('T')[0];
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(flight);
        });
        
        return grouped;
    }
    
    formatDateHeader(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Check if today or tomorrow
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        }
        
        // Format as "Monday, January 15"
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    }
    
    formatArrivalTime(isoTime) {
        // In production, use a library like date-fns-tz for proper timezone conversion
        // For now, we'll use local time
        const date = new Date(isoTime);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
    
    openFlightModal(flightId = null) {
        this.editingFlightId = flightId;
        
        // Update modal HTML first
        this.updateModalHTML();
        
        if (flightId) {
            // Edit mode
            const flight = this.flights.find(f => f.id === flightId);
            if (flight) {
                this.populateForm(flight);
            }
        } else {
            // Add mode
            this.resetForm();
        }
        
        // Show modal
        this.showModal();
    }
    
    updateModalHTML() {
        const modalHTML = `
            <div class="flight-modal-content">
                <div class="flight-modal-header">
                    <h3>${this.editingFlightId ? 'Edit Flight' : 'Add Flight'}</h3>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <form id="flight-form-inner">
                    <div class="form-group">
                        <label for="traveler-name">Traveler Name *</label>
                        <input type="text" id="traveler-name" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="airline">Airline *</label>
                            <input type="text" id="airline" required>
                        </div>
                        <div class="form-group">
                            <label for="flight-number">Flight Number *</label>
                            <input type="text" id="flight-number" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="departure-airport">Departure Airport</label>
                        <input type="text" id="departure-airport">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="arrival-airport-code">Arrival Airport Code *</label>
                            <input type="text" id="arrival-airport-code" maxlength="4" required>
                        </div>
                        <div class="form-group">
                            <label for="arrival-city">Arrival City *</label>
                            <input type="text" id="arrival-city" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="arrival-time">Arrival Date & Time *</label>
                        <input type="datetime-local" id="arrival-time" required>
                    </div>
                    <div class="form-group">
                        <label for="flight-notes">Notes</label>
                        <textarea id="flight-notes" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel">Cancel</button>
                        <button type="submit" class="btn-primary">Save Flight</button>
                    </div>
                </form>
            </div>
        `;
        
        // Create or update modal
        let modal = document.getElementById('flight-modal-dynamic');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'flight-modal-dynamic';
            modal.className = 'flight-modal hidden';
            document.body.appendChild(modal);
        }
        modal.innerHTML = modalHTML;
        
        // Re-cache form elements
        this.elements.modal = modal;
        this.elements.form = modal.querySelector('#flight-form-inner');
        
        // Re-attach event listeners
        const closeBtn = modal.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeFlightModal());
        }
        
        const cancelBtn = modal.querySelector('.btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeFlightModal());
        }
        
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveFlight();
            });
        }
        
        // Auto-uppercase airport code
        const airportCode = modal.querySelector('#arrival-airport-code');
        if (airportCode) {
            airportCode.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
    }
    
    populateForm(flight) {
        const form = this.elements.form;
        if (!form) return;
        
        form.querySelector('#traveler-name').value = flight.travelerName || '';
        form.querySelector('#airline').value = flight.airline || '';
        form.querySelector('#flight-number').value = flight.flightNumber || '';
        form.querySelector('#departure-airport').value = flight.departureAirport || '';
        form.querySelector('#arrival-airport-code').value = flight.arrivalAirportCode || '';
        form.querySelector('#arrival-city').value = flight.arrivalCity || '';
        form.querySelector('#arrival-time').value = flight.arrivalTimeISO || '';
        form.querySelector('#flight-notes').value = flight.notes || '';
    }
    
    resetForm() {
        if (this.elements.form) {
            this.elements.form.reset();
        }
    }
    
    showModal() {
        if (this.elements.modal) {
            this.elements.modal.classList.remove('hidden');
        }
    }
    
    closeFlightModal() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('hidden');
        }
        this.editingFlightId = null;
    }
    
    async saveFlight() {
        const form = this.elements.form;
        if (!form) return;
        
        const flightData = {
            travelerName: form.querySelector('#traveler-name').value,
            airline: form.querySelector('#airline').value,
            flightNumber: form.querySelector('#flight-number').value,
            departureAirport: form.querySelector('#departure-airport').value,
            arrivalAirportCode: form.querySelector('#arrival-airport-code').value.toUpperCase(),
            arrivalAirportName: form.querySelector('#arrival-airport-code').value + ' Airport',
            arrivalCity: form.querySelector('#arrival-city').value,
            arrivalTimeISO: form.querySelector('#arrival-time').value,
            notes: form.querySelector('#flight-notes').value
        };
        
        try {
            let response;
            if (this.editingFlightId) {
                // Update existing
                response = await fetch(`/api/trips/${this.currentTripId}/flights/${this.editingFlightId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(flightData)
                });
            } else {
                // Create new
                response = await fetch(`/api/trips/${this.currentTripId}/flights`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(flightData)
                });
            }
            
            if (response.ok) {
                this.closeFlightModal();
                await this.loadFlights();
                this.showSuccessMessage('Flight saved successfully');
            } else {
                throw new Error('Failed to save flight');
            }
        } catch (error) {
            console.error('[FlightsPage] Save error:', error);
            this.showErrorMessage('Failed to save flight. Please try again.');
        }
    }
    
    async deleteFlight(flightId) {
        if (!confirm('Are you sure you want to delete this flight?')) {
            return;
        }
        
        // Optimistic UI - remove immediately
        this.flights = this.flights.filter(f => f.id !== flightId);
        this.render();
        
        try {
            const response = await fetch(`/api/trips/${this.currentTripId}/flights/${flightId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showSuccessMessage('Flight deleted successfully');
            } else {
                throw new Error('Failed to delete flight');
            }
        } catch (error) {
            console.error('[FlightsPage] Delete error:', error);
            // Revert on error
            await this.loadFlights();
            this.showErrorMessage('Failed to delete flight. Please try again.');
        }
    }
    
    showFlightDetails(flightId) {
        const flight = this.flights.find(f => f.id === flightId);
        if (!flight) return;
        
        // For now, just open edit modal
        // In production, you might show a read-only drawer
        this.openFlightModal(flightId);
    }
    
    setupSocketListeners() {
        if (!this.socket) return;
        
        this.socket.on('flight-added', (flight) => {
            if (flight.tripId === this.currentTripId) {
                this.flights.push(flight);
                this.render();
            }
        });
        
        this.socket.on('flight-updated', (flight) => {
            if (flight.tripId === this.currentTripId) {
                const index = this.flights.findIndex(f => f.id === flight.id);
                if (index !== -1) {
                    this.flights[index] = flight;
                    this.render();
                }
            }
        });
        
        this.socket.on('flight-deleted', (data) => {
            this.flights = this.flights.filter(f => f.id !== data.flightId);
            this.render();
        });
    }
    
    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }
    
    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideInUp 0.3s ease;
            background: ${type === 'success' ? 'var(--emerald)' : '#dc3545'};
            color: white;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutDown 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Don't auto-initialize - let the tab switcher handle it
// The FlightsPage class is available globally for manual initialization