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
            e.preventDefault();
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
        // Don't close if clicking on dropdown or its children
        if (e.relatedTarget && this.dropdown.contains(e.relatedTarget)) {
            return;
        }
        
        // Delay to allow click on dropdown items
        // Increased delay for better click handling
        setTimeout(() => {
            // Only close if the click wasn't on the dropdown
            if (!this.dropdown.contains(document.activeElement) && 
                !this.wrapper.contains(document.activeElement)) {
                this.close();
            }
        }, 150);
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
            this.showError();
        } finally {
            this.hideLoader();
        }
    }
    
    updateDropdown() {
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
            
            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent blur event
                e.stopPropagation(); // Stop event bubbling
            });
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
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