'use strict';

(function() {
    let joinTripModal, tripCreatedModal;
    let currentTrip = null;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTripHero);
    } else {
        initTripHero();
    }
    
    function initTripHero() {
        console.log('[TripHero] Initializing...');
        
        // Cache modal elements
        joinTripModal = document.getElementById('join-trip-modal');
        tripCreatedModal = document.getElementById('trip-created-modal');
        
        if (!joinTripModal || !tripCreatedModal) {
            console.warn('[TripHero] Modal elements not found');
            return;
        }
        
        setupEventListeners();
        
        // Check for saved trip code
        const savedCode = getSavedTripCode();
        if (savedCode) {
            populateJoinForm(savedCode);
        }
    }
    
    function setupEventListeners() {
        // Join trip link
        const joinTripLink = document.getElementById('join-trip-link');
        if (joinTripLink) {
            joinTripLink.addEventListener('click', showJoinTripModal);
        }
        
        // Hero search (Start a Trip)
        const heroSearch = document.getElementById('hero-search');
        if (heroSearch) {
            heroSearch.addEventListener('click', handleStartTrip);
        }
        
        // Join trip modal controls
        const joinForm = document.getElementById('join-trip-form');
        const cancelJoinBtn = document.getElementById('cancel-join-trip');
        
        if (joinForm) {
            joinForm.addEventListener('submit', handleJoinTrip);
        }
        
        if (cancelJoinBtn) {
            cancelJoinBtn.addEventListener('click', hideJoinTripModal);
        }
        
        // Trip created modal controls  
        const copyCodeBtn = document.getElementById('copy-trip-code');
        const goToTripBtn = document.getElementById('go-to-trip');
        
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', copyTripCode);
        }
        
        if (goToTripBtn) {
            goToTripBtn.addEventListener('click', goToTrip);
        }
        
        // Modal close buttons
        document.querySelectorAll('.trip-modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.trip-modal');
                if (modal) {
                    hideModal(modal);
                }
            });
        });
        
        // Modal backdrop clicks
        document.querySelectorAll('.trip-modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                const modal = e.target.closest('.trip-modal');
                if (modal) {
                    hideModal(modal);
                }
            });
        });
        
        // Trip code input formatting
        const tripCodeInput = document.getElementById('trip-code-input');
        if (tripCodeInput) {
            tripCodeInput.addEventListener('input', formatTripCodeInput);
            tripCodeInput.addEventListener('paste', handleTripCodePaste);
        }
    }
    
    function showJoinTripModal() {
        console.log('[TripHero] Showing join trip modal');
        showModal(joinTripModal);
        
        // Focus on input
        const input = document.getElementById('trip-code-input');
        if (input) {
            setTimeout(() => input.focus(), 100);
        }
    }
    
    function hideJoinTripModal() {
        hideModal(joinTripModal);
        resetJoinForm();
    }
    
    function showTripCreatedModal(trip) {
        console.log('[TripHero] Showing trip created modal');
        
        // Update modal content
        const codeElement = document.getElementById('created-trip-code');
        if (codeElement && trip.shareCode) {
            codeElement.textContent = trip.shareCode;
        }
        
        currentTrip = trip;
        showModal(tripCreatedModal);
    }
    
    function showModal(modal) {
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function hideModal(modal) {
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
    
    async function handleStartTrip(e) {
        e.preventDefault();
        console.log('[TripHero] Starting trip creation...');
        
        // MANDATORY AUTHENTICATION CHECK - Block all trip creation without login
        if (!window.authGuard) {
            showError('Authentication system not available. Please refresh the page.');
            return;
        }
        
        // Enforce authentication before any trip creation
        if (!(await window.authGuard.requireAuth('create a trip'))) {
            console.log('[TripHero] Authentication required - showing auth modal');
            return; // requireAuth will show the auth modal
        }
        
        // Verify user is actually authenticated
        if (!window.authGuard.isUserAuthenticated()) {
            showError('Please log in to create trips.');
            return;
        }
        
        console.log('[TripHero] User authenticated, proceeding with trip creation');
        
        // Get form data from hero search
        const destination = getSearchFieldValue('hero-destination');
        const dates = getSelectedDates();
        const guests = getGuestCounts();
        
        if (!destination) {
            showError('Please enter a destination');
            return;
        }
        
        // Show loading state
        setSearchButtonLoading(true);
        
        try {
            const tripData = {
                name: `Trip to ${destination}`,
                destinationCity: destination,
                startDate: dates.start,
                endDate: dates.end,
                groupSize: guests.adults + guests.children
            };
            
            const trip = await createTrip(tripData);
            console.log('[TripHero] Trip created:', trip);
            
            // Save trip data
            saveTripData(trip);
            
            // Show success modal
            showTripCreatedModal(trip);
            
        } catch (error) {
            console.error('[TripHero] Trip creation failed:', error);
            
            // Check if error is authentication related
            if (error.message && (
                error.message.includes('Authentication required') ||
                error.message.includes('authenticate') ||
                error.message.includes('login')
            )) {
                showError('Please log in to create trips.');
                // Show auth modal
                if (window.authGuard) {
                    window.authGuard.requireAuth('create a trip');
                }
                return;
            }
            
            // Show specific error message about invalid city
            let errorMessage = 'Failed to create trip. Please try again.';
            if (error.message) {
                if (error.message.includes('not a valid city') || 
                    error.message.includes('Invalid destination')) {
                    errorMessage = error.message;
                    
                    // Highlight the destination input field
                    const destInput = document.getElementById('destination-input');
                    if (destInput) {
                        destInput.style.borderColor = '#dc3545';
                        destInput.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
                        destInput.focus();
                        
                        // Reset the border after a few seconds
                        setTimeout(() => {
                            destInput.style.borderColor = '';
                            destInput.style.boxShadow = '';
                        }, 5000);
                    }
                }
            }
            
            showError(errorMessage);
        } finally {
            setSearchButtonLoading(false);
        }
    }
    
    async function handleJoinTrip(e) {
        e.preventDefault();
        console.log('[TripHero] Joining trip...');
        
        // Check authentication before allowing trip joining
        if (window.authGuard && !(await window.authGuard.requireAuth('join a trip'))) {
            console.log('[TripHero] User not authenticated, showing auth modal');
            hideJoinTripModal();
            return;
        }
        
        const tripCode = document.getElementById('trip-code-input').value.trim().toUpperCase();
        
        if (!tripCode) {
            showJoinError('Please enter a trip code');
            return;
        }
        
        // Validate format
        if (!/^[A-Z0-9]{8}$/.test(tripCode)) {
            showJoinError('Trip code must be 8 characters (letters and numbers)');
            return;
        }
        
        clearJoinMessages();
        setJoinButtonLoading(true);
        
        try {
            const response = await fetch('/api/trips/join-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: tripCode })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to join trip');
            }
            
            const tripInfo = await response.json();
            console.log('[TripHero] Trip joined:', tripInfo);
            
            // Save trip code and clear from localStorage
            clearSavedTripCode();
            
            // Show success and redirect
            showJoinSuccess('Successfully joined trip!');
            
            setTimeout(() => {
                window.location.href = `/trip/${tripInfo.tripId}`;
            }, 1500);
            
        } catch (error) {
            console.error('[TripHero] Join failed:', error);
            showJoinError(error.message || 'Invalid or expired trip code');
        } finally {
            setJoinButtonLoading(false);
        }
    }
    
    async function createTrip(tripData) {
        // ABSOLUTE REQUIREMENT: Authentication guard must be available
        if (!window.authGuard) {
            throw new Error('Authentication system not initialized. Please refresh the page.');
        }
        
        // ABSOLUTE REQUIREMENT: User must be authenticated
        if (!window.authGuard.isUserAuthenticated()) {
            throw new Error('Authentication required to create trips. Please log in.');
        }
        
        console.log('[TripHero] Creating authenticated trip...');
        
        try {
            // Use ONLY authenticated trip creation - no fallbacks
            const result = await window.authGuard.createAuthenticatedTrip(tripData);
            console.log('[TripHero] Authenticated trip creation successful:', result);
            return result;
        } catch (error) {
            console.error('[TripHero] Authenticated trip creation failed:', error);
            
            // If the GraphQL/Amplify approach fails, try the authenticated server endpoint
            if (!window.authGuard.isUserAuthenticated()) {
                throw new Error('Authentication lost during trip creation. Please log in again.');
            }
            
            // Try authenticated server endpoint as backup
            console.log('[TripHero] Trying server-based authenticated trip creation...');
            const response = await fetch('/api/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`  // Must provide auth token
                },
                body: JSON.stringify(tripData)
            });
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Authentication required to create trips. Please log in.');
                }
                throw new Error('Failed to create trip. Please try again.');
            }
            
            const serverTrip = await response.json();
            console.log('[TripHero] Server-based authenticated trip creation successful:', serverTrip);
            return serverTrip;
        }
    }
    
    // Helper function to get authentication token
    function getAuthToken() {
        // Try to get token from auth guard or localStorage
        if (window.authGuard && window.authGuard.currentUser) {
            return window.authGuard.currentUser.token || localStorage.getItem('authToken');
        }
        return localStorage.getItem('authToken') || null;
    }
    
    function copyTripCode() {
        const codeElement = document.getElementById('created-trip-code');
        const copyBtn = document.getElementById('copy-trip-code');
        
        if (!codeElement || !copyBtn) return;
        
        const code = codeElement.textContent;
        
        // Copy to clipboard
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code).then(() => {
                showCopySuccess(copyBtn);
            }).catch(err => {
                console.error('[TripHero] Clipboard copy failed:', err);
                fallbackCopy(code, copyBtn);
            });
        } else {
            fallbackCopy(code, copyBtn);
        }
    }
    
    function fallbackCopy(text, button) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showCopySuccess(button);
        } catch (err) {
            console.error('[TripHero] Fallback copy failed:', err);
        } finally {
            document.body.removeChild(textArea);
        }
    }
    
    function showCopySuccess(button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
    }
    
    function goToTrip() {
        if (currentTrip && currentTrip.id) {
            window.location.href = `/trip/${currentTrip.id}`;
        }
    }
    
    // Helper functions
    function getSearchFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value.trim() : '';
    }
    
    function getSelectedDates() {
        // TODO: Integrate with calendar component
        return {
            start: null,
            end: null
        };
    }
    
    function getGuestCounts() {
        // TODO: Integrate with guest selector
        return {
            adults: 2,
            children: 0,
            infants: 0
        };
    }
    
    function setSearchButtonLoading(loading) {
        const btn = document.getElementById('hero-search');
        if (btn) {
            btn.disabled = loading;
            if (loading) {
                btn.classList.add('loading');
                btn.setAttribute('aria-label', 'Creating trip...');
            } else {
                btn.classList.remove('loading');
                btn.setAttribute('aria-label', 'Start a trip');
            }
        }
    }
    
    function setJoinButtonLoading(loading) {
        const btn = document.getElementById('submit-join-trip');
        if (btn) {
            btn.disabled = loading;
            btn.classList.toggle('loading', loading);
        }
    }
    
    function showJoinError(message) {
        const errorEl = document.getElementById('trip-code-error');
        const input = document.getElementById('trip-code-input');
        
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
        
        if (input) {
            input.classList.add('error');
        }
    }
    
    function showJoinSuccess(message) {
        const successEl = document.getElementById('trip-code-success');
        const input = document.getElementById('trip-code-input');
        
        if (successEl) {
            successEl.textContent = message;
            successEl.classList.remove('hidden');
        }
        
        if (input) {
            input.classList.add('success');
            input.classList.remove('error');
        }
    }
    
    function clearJoinMessages() {
        const errorEl = document.getElementById('trip-code-error');
        const successEl = document.getElementById('trip-code-success');
        const input = document.getElementById('trip-code-input');
        
        if (errorEl) errorEl.classList.add('hidden');
        if (successEl) successEl.classList.add('hidden');
        if (input) {
            input.classList.remove('error', 'success');
        }
    }
    
    function resetJoinForm() {
        const form = document.getElementById('join-trip-form');
        if (form) {
            form.reset();
            clearJoinMessages();
        }
    }
    
    function formatTripCodeInput(e) {
        const input = e.target;
        let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        if (value.length > 8) {
            value = value.substring(0, 8);
        }
        
        input.value = value;
        clearJoinMessages();
    }
    
    function handleTripCodePaste(e) {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const cleaned = paste.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
        
        e.target.value = cleaned;
        clearJoinMessages();
    }
    
    function populateJoinForm(code) {
        const input = document.getElementById('trip-code-input');
        if (input) {
            input.value = code;
        }
    }
    
    function saveTripData(trip) {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('currentTrip', JSON.stringify(trip));
                localStorage.setItem('currentTripId', trip.id);
            } catch (error) {
                console.error('[TripHero] Failed to save trip data:', error);
            }
        }
    }
    
    function getSavedTripCode() {
        if (typeof localStorage !== 'undefined') {
            try {
                return localStorage.getItem('pendingTripCode');
            } catch (error) {
                console.error('[TripHero] Failed to get saved trip code:', error);
            }
        }
        return null;
    }
    
    function clearSavedTripCode() {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem('pendingTripCode');
            } catch (error) {
                console.error('[TripHero] Failed to clear saved trip code:', error);
            }
        }
    }
    
    function showError(message) {
        // Simple error display - you could enhance this with a toast notification
        alert(message);
    }
    
    // Expose handleStartTrip for other handlers to use
    window.handleStartTrip = handleStartTrip;
    
    console.log('[TripHero] Module loaded with secured handlers exposed');
})();