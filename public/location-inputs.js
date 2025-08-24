'use strict';

/**
 * Location Inputs Integration
 * Applies PlacesAutocomplete to all location input fields in the app
 */
(function() {
    let autocompleteInstances = [];
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLocationInputs);
    } else {
        initLocationInputs();
    }
    
    function initLocationInputs() {
        console.log('[LocationInputs] Initializing autocomplete for location fields...');
        
        // Wait for PlacesAutocomplete to be available
        if (!window.PlacesAutocomplete) {
            console.warn('[LocationInputs] PlacesAutocomplete not loaded yet, retrying...');
            setTimeout(initLocationInputs, 100);
            return;
        }
        
        // Hero search destination input
        setupAutocomplete('hero-destination', {
            placeholder: 'Search destinations',
            types: 'city,country',
            debounceDelay: 150, // Faster response
            maxResults: 10, // More results
            onSelect: (place) => {
                console.log('[LocationInputs] Hero destination selected:', place);
                // Store selected place data
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem('selectedDestination', JSON.stringify(place));
                }
                // Focus on next field (dates)
                const datesField = document.getElementById('hero-dates');
                if (datesField) {
                    setTimeout(() => datesField.click(), 100);
                }
            }
        });
        
        // Trip creation - departure city
        setupAutocomplete('departure-city', {
            placeholder: 'e.g., New York, NY',
            types: 'city',
            onSelect: (place) => {
                console.log('[LocationInputs] Departure city selected:', place);
                updateTripFormData('departureCity', place);
            }
        });
        
        // Trip creation - destination city
        setupAutocomplete('destination-city', {
            placeholder: 'e.g., Paris, France',
            types: 'city,country',
            onSelect: (place) => {
                console.log('[LocationInputs] Destination city selected:', place);
                updateTripFormData('destinationCity', place);
            }
        });
        
        // Itinerary card location
        setupAutocomplete('card-location', {
            placeholder: 'e.g., Eiffel Tower, Paris',
            types: 'city,place',
            allowFreeText: true,
            onSelect: (place) => {
                console.log('[LocationInputs] Card location selected:', place);
            }
        });
        
        // Flight modal - departure airport
        setupAutocomplete('departure-airport', {
            placeholder: 'e.g., JFK',
            types: 'airport,city',
            allowFreeText: true,
            maxResults: 5,
            onSelect: (place) => {
                console.log('[LocationInputs] Departure airport selected:', place);
            }
        });
        
        // Flight modal - arrival airport
        setupAutocomplete('arrival-airport', {
            placeholder: 'e.g., CDG',
            types: 'airport,city',
            allowFreeText: true,
            maxResults: 5,
            onSelect: (place) => {
                console.log('[LocationInputs] Arrival airport selected:', place);
            }
        });
        
        // Places tab search
        setupAutocomplete('place-search', {
            placeholder: 'Search for specific places...',
            types: 'all',
            allowFreeText: true,
            showClearButton: true,
            onSelect: (place) => {
                console.log('[LocationInputs] Place search selected:', place);
                // Trigger search in places tab
                if (window.places && typeof window.places.searchLocation === 'function') {
                    window.places.searchLocation(place);
                }
            }
        });
        
        // Listen for dynamic content changes
        observeDynamicInputs();
    }
    
    function setupAutocomplete(inputId, options = {}) {
        const input = document.getElementById(inputId);
        if (!input) {
            console.log(`[LocationInputs] Input #${inputId} not found, skipping`);
            return null;
        }
        
        // Check if already initialized
        if (input.dataset.autocompleteInit === 'true') {
            console.log(`[LocationInputs] Input #${inputId} already initialized`);
            return null;
        }
        
        try {
            const instance = new PlacesAutocomplete(input, {
                minChars: 2,
                debounceDelay: 250,
                maxResults: 8,
                ...options
            });
            
            input.dataset.autocompleteInit = 'true';
            autocompleteInstances.push(instance);
            
            console.log(`[LocationInputs] Autocomplete initialized for #${inputId}`);
            return instance;
        } catch (error) {
            console.error(`[LocationInputs] Error initializing autocomplete for #${inputId}:`, error);
            return null;
        }
    }
    
    function updateTripFormData(field, place) {
        // Store in session/local storage for form persistence
        if (typeof sessionStorage !== 'undefined') {
            const tripFormData = JSON.parse(sessionStorage.getItem('tripFormData') || '{}');
            tripFormData[field] = {
                name: place.description,
                place_id: place.place_id,
                coordinates: place.lat && place.lon ? { lat: place.lat, lon: place.lon } : null
            };
            sessionStorage.setItem('tripFormData', JSON.stringify(tripFormData));
        }
    }
    
    function observeDynamicInputs() {
        // Watch for dynamically added inputs (modals, etc.)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if it's a location input or contains location inputs
                        const inputs = node.querySelectorAll ? 
                            node.querySelectorAll('input[type="text"]') : [];
                        
                        inputs.forEach((input) => {
                            // Check if it's a location-related input by ID or class
                            const isLocationInput = 
                                input.id.includes('location') ||
                                input.id.includes('city') ||
                                input.id.includes('airport') ||
                                input.id.includes('destination') ||
                                input.id.includes('departure') ||
                                input.placeholder.toLowerCase().includes('location') ||
                                input.placeholder.toLowerCase().includes('city');
                            
                            if (isLocationInput && !input.dataset.autocompleteInit) {
                                console.log(`[LocationInputs] Found new location input: ${input.id || 'unnamed'}`);
                                setupAutocomplete(input.id || null, {
                                    placeholder: input.placeholder,
                                    allowFreeText: true
                                });
                            }
                        });
                    }
                });
            });
        });
        
        // Start observing the document body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Public API
    window.locationInputs = {
        setup: setupAutocomplete,
        getInstances: () => autocompleteInstances,
        refresh: () => {
            // Re-initialize all inputs
            autocompleteInstances.forEach(instance => instance.destroy());
            autocompleteInstances = [];
            initLocationInputs();
        }
    };
    
    console.log('[LocationInputs] Module loaded');
})();