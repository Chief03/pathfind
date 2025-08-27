'use strict';

(function() {

    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGuestSelector);
    } else {
        // DOM is already loaded
        initGuestSelector();
    }

    function initGuestSelector() {
        console.log('[GuestSelector] Initializing...');
        
        // Get all required elements with safety checks
        const elements = {
            whoInput: document.getElementById('hero-who'),
            whoDropdown: document.getElementById('who-dropdown'),
            totalSummary: document.getElementById('total-guests-summary'),
            maxWarning: document.getElementById('max-guests-warning'),
            clearBtn: document.getElementById('clear-guests'),
            applyBtn: document.getElementById('apply-guests'),
            closeBtn: document.querySelector('.close-who')
        };
        
        // Check if essential elements exist
        if (!elements.whoInput || !elements.whoDropdown) {
            console.warn('[GuestSelector] Essential elements not found:', {
                whoInput: !!elements.whoInput,
                whoDropdown: !!elements.whoDropdown
            });
            return;
        }
        
        // Guest state
        const MAX_GUESTS = 16;
        let guestCounts = getStoredGuests();
        
        // Get stored guests safely
        function getStoredGuests() {
            try {
                const stored = localStorage.getItem('guestSelection');
                if (stored) {
                    return JSON.parse(stored);
                }
            } catch (e) {
                console.warn('[GuestSelector] Error reading localStorage:', e);
            }
            return {
                adults: 2,
                children: 0,
                infants: 0,
                pets: 0
            };
        }
        
        // Save guests safely
        function saveGuests() {
            try {
                localStorage.setItem('guestSelection', JSON.stringify(guestCounts));
            } catch (e) {
                console.warn('[GuestSelector] Error saving to localStorage:', e);
            }
        }
        
        // Update the display text
        function updateDisplay() {
            const parts = [];
            
            if (guestCounts.adults > 0) {
                parts.push(`${guestCounts.adults} adult${guestCounts.adults !== 1 ? 's' : ''}`);
            }
            if (guestCounts.children > 0) {
                parts.push(`${guestCounts.children} child${guestCounts.children !== 1 ? 'ren' : ''}`);
            }
            if (guestCounts.infants > 0) {
                parts.push(`${guestCounts.infants} infant${guestCounts.infants !== 1 ? 's' : ''}`);
            }
            if (guestCounts.pets > 0) {
                parts.push(`${guestCounts.pets} pet${guestCounts.pets !== 1 ? 's' : ''}`);
            }
            
            // Update input field
            if (elements.whoInput) {
                elements.whoInput.value = parts.length > 0 ? parts.join(', ') : 'Add guests';
            }
            
            // Update total summary
            const totalGuests = guestCounts.adults + guestCounts.children;
            if (elements.totalSummary) {
                elements.totalSummary.textContent = `${totalGuests} guest${totalGuests !== 1 ? 's' : ''} total`;
            }
            
            // Check max guests
            if (totalGuests > MAX_GUESTS) {
                if (elements.maxWarning) {
                    elements.maxWarning.classList.remove('hidden');
                }
                if (elements.applyBtn) {
                    elements.applyBtn.disabled = true;
                }
            } else {
                if (elements.maxWarning) {
                    elements.maxWarning.classList.add('hidden');
                }
                if (elements.applyBtn) {
                    elements.applyBtn.disabled = false;
                }
            }
            
            // Update clear button
            const hasGuests = Object.values(guestCounts).some(count => count > 0);
            if (elements.clearBtn) {
                elements.clearBtn.disabled = !hasGuests || guestCounts.adults === 1;
            }
            
            saveGuests();
        }
        
        // Setup stepper controls
        function setupSteppers() {
            const types = ['adults', 'children', 'infants', 'pets'];
            
            types.forEach(type => {
                const minusBtn = document.getElementById(`${type}-minus`);
                const plusBtn = document.getElementById(`${type}-plus`);
                const countSpan = document.getElementById(`${type}-count`);
                
                if (!minusBtn || !plusBtn || !countSpan) {
                    console.warn(`[GuestSelector] Missing elements for ${type}`);
                    return;
                }
                
                const min = type === 'adults' ? 1 : 0;
                const max = type === 'pets' ? 5 : 20;
                
                // Update button states
                function updateButtons() {
                    const count = guestCounts[type];
                    minusBtn.disabled = count <= min;
                    plusBtn.disabled = count >= max || 
                        (type !== 'infants' && type !== 'pets' && 
                         guestCounts.adults + guestCounts.children >= MAX_GUESTS);
                    countSpan.textContent = count;
                    
                    // Update ARIA
                    const typeName = type === 'children' ? 'child' : type.slice(0, -1);
                    const plural = count !== 1 ? (type === 'children' ? 'ren' : 's') : '';
                    countSpan.setAttribute('aria-label', `${count} ${typeName}${plural}`);
                }
                
                // Minus button handler
                minusBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (guestCounts[type] > min) {
                        guestCounts[type]--;
                        updateButtons();
                        updateDisplay();
                    }
                });
                
                // Plus button handler
                plusBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const totalGuests = guestCounts.adults + guestCounts.children;
                    
                    if (type === 'infants' || type === 'pets') {
                        if (guestCounts[type] < max) {
                            guestCounts[type]++;
                            updateButtons();
                            updateDisplay();
                        }
                    } else {
                        if (guestCounts[type] < max && totalGuests < MAX_GUESTS) {
                            guestCounts[type]++;
                            updateButtons();
                            updateDisplay();
                        }
                    }
                });
                
                // Initialize
                updateButtons();
            });
        }
        
        // Setup dropdown toggle
        function setupDropdownToggle() {
            // Open/close dropdown
            elements.whoInput.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const isHidden = elements.whoDropdown.classList.contains('hidden');
                if (isHidden) {
                    elements.whoDropdown.classList.remove('hidden');
                    elements.whoInput.setAttribute('aria-expanded', 'true');
                    console.log('[GuestSelector] Dropdown opened');
                } else {
                    elements.whoDropdown.classList.add('hidden');
                    elements.whoInput.setAttribute('aria-expanded', 'false');
                    console.log('[GuestSelector] Dropdown closed');
                }
            });
            
            // Make input look clickable
            elements.whoInput.style.cursor = 'pointer';
        }
        
        // Setup action buttons
        function setupActionButtons() {
            // Clear button
            if (elements.clearBtn) {
                elements.clearBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    guestCounts = { adults: 1, children: 0, infants: 0, pets: 0 };
                    
                    // Update all displays
                    ['adults', 'children', 'infants', 'pets'].forEach(type => {
                        const countSpan = document.getElementById(`${type}-count`);
                        if (countSpan) countSpan.textContent = guestCounts[type];
                    });
                    
                    updateDisplay();
                    setupSteppers(); // Re-initialize button states
                });
            }
            
            // Apply button
            if (elements.applyBtn) {
                elements.applyBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    elements.whoDropdown.classList.add('hidden');
                    elements.whoInput.setAttribute('aria-expanded', 'false');
                });
            }
            
            // Close button
            if (elements.closeBtn) {
                elements.closeBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    elements.whoDropdown.classList.add('hidden');
                    elements.whoInput.setAttribute('aria-expanded', 'false');
                });
            }
        }
        
        // Setup keyboard shortcuts
        function setupKeyboardShortcuts() {
            document.addEventListener('keydown', function(e) {
                if (!elements.whoDropdown.classList.contains('hidden')) {
                    if (e.key === 'Escape') {
                        elements.whoDropdown.classList.add('hidden');
                        elements.whoInput.setAttribute('aria-expanded', 'false');
                        elements.whoInput.focus();
                    } else if (e.key === 'Enter' && e.target.id !== 'clear-guests') {
                        e.preventDefault();
                        if (elements.applyBtn && !elements.applyBtn.disabled) {
                            elements.applyBtn.click();
                        }
                    }
                }
            });
        }
        
        // Setup click outside to close
        function setupClickOutside() {
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.who-field') && 
                    !e.target.closest('#who-dropdown') &&
                    !elements.whoDropdown.classList.contains('hidden')) {
                    elements.whoDropdown.classList.add('hidden');
                    elements.whoInput.setAttribute('aria-expanded', 'false');
                }
            });
        }
        
        // Initialize everything
        try {
            setupDropdownToggle();
            setupSteppers();
            setupActionButtons();
            setupKeyboardShortcuts();
            setupClickOutside();
            updateDisplay();
            console.log('[GuestSelector] Initialization complete');
        } catch (error) {
            console.error('[GuestSelector] Initialization error:', error);
        }
    }
})();