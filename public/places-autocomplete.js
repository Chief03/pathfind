'use strict';

/**
 * Places Autocomplete Component
 * Provides Google Places-like autocomplete functionality for location inputs
 */
class PlacesAutocomplete {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            minChars: options.minChars || 2,
            debounceDelay: options.debounceDelay || 200,
            maxResults: options.maxResults || 8,
            types: options.types || 'city,state,country',
            placeholder: options.placeholder || 'Enter a location...',
            onSelect: options.onSelect || (() => {}),
            onClear: options.onClear || (() => {}),
            allowFreeText: options.allowFreeText !== false,
            showClearButton: options.showClearButton !== false,
            ...options
        };
        
        // State
        this.predictions = [];
        this.selectedIndex = -1;
        this.sessionToken = this.generateSessionToken();
        this.debounceTimer = null;
        this.cache = new Map();
        this.lastQuery = '';
        this.isOpen = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.pendingSelection = null;
        this.userInteracting = false;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Create wrapper and dropdown
        this.createElements();
        
        // Bind events
        this.bindEvents();
        
        // Set initial placeholder
        if (this.options.placeholder) {
            this.input.placeholder = this.options.placeholder;
        }
    }
    
    createElements() {
        // Wrap input in container
        const wrapper = document.createElement('div');
        wrapper.className = 'places-autocomplete-wrapper';
        this.input.parentNode.insertBefore(wrapper, this.input);
        wrapper.appendChild(this.input);
        
        // Add classes to input
        this.input.classList.add('places-autocomplete-input');
        
        // Create clear button
        if (this.options.showClearButton) {
            this.clearButton = document.createElement('button');
            this.clearButton.className = 'places-clear-btn';
            this.clearButton.innerHTML = '×';
            this.clearButton.style.display = 'none';
            this.clearButton.setAttribute('aria-label', 'Clear location');
            this.clearButton.type = 'button';
            wrapper.appendChild(this.clearButton);
        }
        
        // Create dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'places-autocomplete-dropdown';
        this.dropdown.style.display = 'none';
        this.dropdown.setAttribute('role', 'listbox');
        wrapper.appendChild(this.dropdown);
        
        // Create loading indicator
        this.loader = document.createElement('div');
        this.loader.className = 'places-autocomplete-loader';
        this.loader.innerHTML = '<span class="loader-spinner"></span> Searching...';
        this.loader.style.display = 'none';
        wrapper.appendChild(this.loader);
        
        this.wrapper = wrapper;
    }
    
    bindEvents() {
        // Input events
        this.input.addEventListener('input', this.handleInput.bind(this));
        this.input.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.input.addEventListener('focus', this.handleFocus.bind(this));
        this.input.addEventListener('blur', this.handleBlur.bind(this));
        
        // Clear button
        if (this.clearButton) {
            this.clearButton.addEventListener('click', this.clear.bind(this));
        }
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });
        
        // Prevent dropdown from closing on interaction
        this.dropdown.addEventListener('mousedown', (e) => {
            console.log('[PlacesAutocomplete] 🖱️ Dropdown mousedown - preventing default');
            this.userInteracting = true;
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Additional safety: prevent dropdown from closing on any mouse interaction
        this.dropdown.addEventListener('mouseup', (e) => {
            console.log('[PlacesAutocomplete] 🖱️ Dropdown mouseup');
            e.stopPropagation();
            // Reset interaction flag after a delay
            setTimeout(() => {
                this.userInteracting = false;
            }, 100);
        });
        
        this.dropdown.addEventListener('mouseenter', () => {
            console.log('[PlacesAutocomplete] 🖱️ Mouse entered dropdown');
            this.userInteracting = true;
        });
        
        this.dropdown.addEventListener('mouseleave', () => {
            console.log('[PlacesAutocomplete] 🖱️ Mouse left dropdown');
            setTimeout(() => {
                this.userInteracting = false;
            }, 100);
        });
        
        // Track mouse position for better blur handling
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
    }
    
    handleInput(e) {
        const query = e.target.value.trim();
        
        // Show/hide clear button
        if (this.clearButton) {
            this.clearButton.style.display = query ? 'block' : 'none';
        }
        
        // Clear predictions if query is too short
        if (query.length < this.options.minChars) {
            this.close();
            this.lastQuery = '';
            return;
        }
        
        // Don't search if query hasn't changed
        if (query === this.lastQuery) {
            return;
        }
        
        this.lastQuery = query;
        
        // Debounce the search
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.search(query);
        }, this.options.debounceDelay);
    }
    
    handleKeyDown(e) {
        if (!this.isOpen || this.predictions.length === 0) {
            // Allow free text submission on Enter if enabled
            if (e.key === 'Enter' && this.options.allowFreeText && this.input.value.trim()) {
                e.preventDefault();
                this.selectFreeText();
            }
            return;
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.navigate(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigate(-1);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectPrediction(this.predictions[this.selectedIndex]);
                } else if (this.options.allowFreeText && this.input.value.trim()) {
                    this.selectFreeText();
                }
                break;
            case 'Escape':
                this.close();
                break;
        }
    }
    
    handleFocus() {
        if (this.predictions.length > 0) {
            this.open();
        }
    }
    
    handleBlur(e) {
        console.log('[PlacesAutocomplete] 🔀 BLUR event triggered');
        
        // Don't close if user is currently interacting
        if (this.userInteracting) {
            console.log('[PlacesAutocomplete] 🚫 Blur cancelled - user is interacting');
            return;
        }
        
        // Don't close if clicking on dropdown or its children
        if (e.relatedTarget && this.dropdown.contains(e.relatedTarget)) {
            console.log('[PlacesAutocomplete] 🚫 Blur cancelled - clicking on dropdown');
            return;
        }
        
        // Delay to allow click on dropdown items
        // Increased delay significantly for better click handling
        setTimeout(() => {
            // Check again if user is interacting
            if (this.userInteracting) {
                console.log('[PlacesAutocomplete] 🚫 Close cancelled - user still interacting');
                return;
            }
            
            // Check if user is currently clicking on dropdown
            if (document.activeElement && this.dropdown.contains(document.activeElement)) {
                console.log('[PlacesAutocomplete] 🚫 Close cancelled - dropdown still focused');
                return;
            }
            
            // Check if mouse is still over dropdown (for pending clicks)
            const dropdownRect = this.dropdown.getBoundingClientRect();
            const isMouseOverDropdown = this.mouseX >= dropdownRect.left && 
                                      this.mouseX <= dropdownRect.right && 
                                      this.mouseY >= dropdownRect.top && 
                                      this.mouseY <= dropdownRect.bottom;
            
            if (isMouseOverDropdown) {
                console.log('[PlacesAutocomplete] 🚫 Close cancelled - mouse over dropdown');
                return;
            }
            
            console.log('[PlacesAutocomplete] ❌ Closing dropdown after blur delay');
            this.close();
        }, 500); // Even longer delay for click handling
    }
    
    navigate(direction) {
        const newIndex = this.selectedIndex + direction;
        
        if (newIndex >= -1 && newIndex < this.predictions.length) {
            this.selectedIndex = newIndex;
            this.updateDropdown();
            
            // Update input with selected prediction
            if (this.selectedIndex >= 0) {
                const prediction = this.predictions[this.selectedIndex];
                this.input.value = prediction.description;
            } else {
                this.input.value = this.lastQuery;
            }
        }
    }
    
    async search(query) {
        // Check cache first
        const cacheKey = `${query.toLowerCase()}_${this.options.types}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
            this.predictions = cached.data;
            this.updateDropdown();
            this.open();
            return;
        }
        
        // Show loader
        this.showLoader();
        
        try {
            const params = new URLSearchParams({
                query: query,
                sessionToken: this.sessionToken,
                types: this.options.types,
                limit: this.options.maxResults
            });
            
            const response = await fetch(`/api/places/autocomplete?${params}`);
            const data = await response.json();
            
            if (data.predictions) {
                this.predictions = data.predictions;
                
                // Cache results
                this.cache.set(cacheKey, {
                    data: this.predictions,
                    timestamp: Date.now()
                });
                
                // Clean old cache entries
                if (this.cache.size > 50) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                
                this.updateDropdown();
                this.open();
            }
        } catch (error) {
            console.error('Places autocomplete error:', error);
            // Show fallback suggestions instead of error
            this.showFallbackSuggestions(query);
        } finally {
            this.hideLoader();
        }
    }
    
    updateDropdown() {
        console.log('[PlacesAutocomplete] 🔄 Updating dropdown with', this.predictions.length, 'predictions');
        this.dropdown.innerHTML = '';
        
        if (this.predictions.length === 0) {
            this.dropdown.innerHTML = `
                <div class="places-no-results">
                    No results found
                    ${this.options.allowFreeText ? '<br><small>Press Enter to use your text</small>' : ''}
                </div>
            `;
            return;
        }
        
        this.predictions.forEach((prediction, index) => {
            const item = document.createElement('div');
            item.className = 'places-autocomplete-item';
            if (index === this.selectedIndex) {
                item.classList.add('selected');
            }
            
            // Highlight matching text
            const mainText = this.highlightMatch(prediction.main_text, this.lastQuery);
            const secondaryText = prediction.secondary_text;
            
            item.innerHTML = `
                <div class="place-icon">${this.getPlaceIcon(prediction.type)}</div>
                <div class="place-text">
                    <div class="place-main">${mainText}</div>
                    ${secondaryText ? `<div class="place-secondary">${secondaryText}</div>` : ''}
                </div>
            `;
            
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', index === this.selectedIndex);
            item.setAttribute('tabindex', '0');
            
            // Multiple event handlers for maximum compatibility
            let clickHandled = false;
            
            item.addEventListener('mousedown', (e) => {
                console.log('[PlacesAutocomplete] 🖱️ MOUSEDOWN detected on:', prediction.description);
                e.preventDefault(); // Prevent blur event
                e.stopPropagation(); // Stop event bubbling
                
                // Set a flag to handle selection on mouseup if click fails
                this.pendingSelection = prediction;
            });
            
            item.addEventListener('mouseup', (e) => {
                console.log('[PlacesAutocomplete] 🖱️ MOUSEUP detected on:', prediction.description);
                e.preventDefault();
                e.stopPropagation();
                
                // If click hasn't been handled, handle it here
                if (!clickHandled && this.pendingSelection === prediction) {
                    console.log('[PlacesAutocomplete] ✅ MOUSEUP SUCCESS - Selecting:', prediction.description);
                    this.selectPrediction(prediction);
                    clickHandled = true;
                }
            });
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[PlacesAutocomplete] ✅ CLICK SUCCESS - Item clicked:', prediction.description);
                console.log('[PlacesAutocomplete] Event details:', {
                    target: e.target.tagName,
                    currentTarget: e.currentTarget.className,
                    timestamp: Date.now()
                });
                this.selectPrediction(prediction);
                clickHandled = true;
            });
            
            // Also handle touch events for mobile
            item.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[PlacesAutocomplete] Item touched:', prediction.description);
                this.selectPrediction(prediction);
            });
            
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateDropdown();
            });
            
            this.dropdown.appendChild(item);
        });
    }
    
    highlightMatch(text, query) {
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }
    
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    getPlaceIcon(type) {
        const icons = {
            city: '🏙️',
            state: '📍',
            country: '🌍',
            place: '📍'
        };
        return icons[type] || '📍';
    }
    
    selectPrediction(prediction) {
        this.input.value = prediction.description;
        this.close();
        
        // Generate new session token for next search
        this.sessionToken = this.generateSessionToken();
        
        // Call callback with selected place data
        this.options.onSelect({
            place_id: prediction.place_id,
            osm_id: prediction.osm_id,
            description: prediction.description,
            main_text: prediction.main_text,
            secondary_text: prediction.secondary_text,
            type: prediction.type,
            lat: prediction.lat,
            lon: prediction.lon
        });
    }
    
    selectFreeText() {
        const value = this.input.value.trim();
        if (!value) return;
        
        this.close();
        
        // Call callback with free text
        this.options.onSelect({
            description: value,
            main_text: value,
            type: 'custom',
            isFreeText: true
        });
    }
    
    clear() {
        this.input.value = '';
        this.predictions = [];
        this.selectedIndex = -1;
        this.lastQuery = '';
        this.close();
        
        if (this.clearButton) {
            this.clearButton.style.display = 'none';
        }
        
        this.input.focus();
        this.options.onClear();
    }
    
    open() {
        if (this.predictions.length > 0 || this.options.allowFreeText) {
            this.dropdown.style.display = 'block';
            this.isOpen = true;
        }
    }
    
    close() {
        this.dropdown.style.display = 'none';
        this.isOpen = false;
        this.selectedIndex = -1;
    }
    
    showLoader() {
        this.loader.style.display = 'block';
        this.dropdown.style.display = 'none';
    }
    
    hideLoader() {
        this.loader.style.display = 'none';
    }
    
    showError() {
        this.dropdown.innerHTML = `
            <div class="places-error">
                <div>Unable to fetch suggestions</div>
                <small>Please try again</small>
            </div>
        `;
        this.dropdown.style.display = 'block';
    }
    
    showFallbackSuggestions(query) {
        console.log('[PlacesAutocomplete] 📋 Showing fallback suggestions for query:', query);
        
        // Provide static suggestions when API fails
        const fallbackSuggestions = [
            { description: 'Colorado, USA', place_id: 'fallback_colorado' },
            { description: 'Denver, Colorado, USA', place_id: 'fallback_denver' },
            { description: 'Boulder, Colorado, USA', place_id: 'fallback_boulder' },
            { description: 'Aspen, Colorado, USA', place_id: 'fallback_aspen' },
            { description: 'Colorado Springs, Colorado, USA', place_id: 'fallback_colorado_springs' },
            { description: 'New York, NY, USA', place_id: 'fallback_nyc' },
            { description: 'Los Angeles, CA, USA', place_id: 'fallback_la' },
            { description: 'Chicago, IL, USA', place_id: 'fallback_chicago' },
            { description: 'Miami, FL, USA', place_id: 'fallback_miami' },
            { description: 'San Francisco, CA, USA', place_id: 'fallback_sf' },
            { description: 'Las Vegas, NV, USA', place_id: 'fallback_vegas' },
            { description: 'Orlando, FL, USA', place_id: 'fallback_orlando' },
            { description: 'Seattle, WA, USA', place_id: 'fallback_seattle' },
            { description: 'Boston, MA, USA', place_id: 'fallback_boston' },
            { description: 'Austin, TX, USA', place_id: 'fallback_austin' },
            { description: 'Phoenix, AZ, USA', place_id: 'fallback_phoenix' },
            { description: 'San Diego, CA, USA', place_id: 'fallback_sandiego' },
            { description: 'Portland, OR, USA', place_id: 'fallback_portland' },
            { description: 'Nashville, TN, USA', place_id: 'fallback_nashville' },
            { description: 'New Orleans, LA, USA', place_id: 'fallback_neworleans' }
        ];
        
        // Filter based on query if provided - more flexible matching
        if (query && query.length > 0) {
            const queryLower = query.toLowerCase();
            // First try exact substring match
            let matches = fallbackSuggestions.filter(s => 
                s.description.toLowerCase().includes(queryLower)
            );
            
            // If no matches, try matching first letters of words
            if (matches.length === 0) {
                matches = fallbackSuggestions.filter(s => {
                    const words = s.description.toLowerCase().split(/[\s,]+/);
                    return words.some(word => word.startsWith(queryLower));
                });
            }
            
            this.predictions = matches.slice(0, 8);
        } else {
            this.predictions = fallbackSuggestions.slice(0, 5);
        }
        
        if (this.predictions.length > 0) {
            this.updateDropdown();
            this.open();
        } else if (this.options.allowFreeText) {
            // Allow free text entry if no matches
            this.dropdown.innerHTML = `
                <div class="places-no-results">
                    No matching locations
                    <br><small>Press Enter to use "${query}"</small>
                </div>
            `;
            this.open();
        }
    }
    
    generateSessionToken() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Public methods
    setValue(value) {
        this.input.value = value;
        if (this.clearButton) {
            this.clearButton.style.display = value ? 'block' : 'none';
        }
    }
    
    getValue() {
        return this.input.value;
    }
    
    destroy() {
        // Remove event listeners
        this.input.removeEventListener('input', this.handleInput);
        this.input.removeEventListener('keydown', this.handleKeyDown);
        this.input.removeEventListener('focus', this.handleFocus);
        this.input.removeEventListener('blur', this.handleBlur);
        
        if (this.clearButton) {
            this.clearButton.removeEventListener('click', this.clear);
        }
        
        // Remove elements
        this.wrapper.parentNode.insertBefore(this.input, this.wrapper);
        this.wrapper.remove();
        
        // Clear references
        this.predictions = [];
        this.cache.clear();
    }
}

// Export for use
window.PlacesAutocomplete = PlacesAutocomplete;