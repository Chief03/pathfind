'use strict';

/**
 * Runtime validation utilities for API responses and data structures
 */
(function() {
    
    // Flight data validator
    function validateFlightData(data) {
        if (!data) return [];
        if (!Array.isArray(data)) return [];
        
        return data.filter(flight => {
            // Basic validation - ensure required fields exist
            return flight && 
                   typeof flight === 'object' &&
                   flight.id &&
                   flight.airline &&
                   flight.flightNumber;
        });
    }
    
    // Location data validator - ensures consistent structure
    function validateLocationData(data) {
        const defaults = {
            city: '',
            state: '',
            country: '',
            place_id: null,
            lat: null,
            lon: null
        };
        
        if (!data || typeof data !== 'object') {
            return defaults;
        }
        
        // Parse description if available
        let city = data.city || '';
        let state = data.state || '';
        let country = data.country || '';
        
        if (data.description && !city) {
            const parts = data.description.split(',').map(p => p.trim());
            city = parts[0] || '';
            state = parts[1] || '';
            country = parts[parts.length - 1] || '';
        }
        
        return {
            city: city || data.main_text || '',
            state: state,
            country: country || data.secondary_text || '',
            place_id: data.place_id || data.osm_id || null,
            lat: data.lat || null,
            lon: data.lon || null,
            description: data.description || `${city}, ${state}, ${country}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
        };
    }
    
    // API response validator
    function validateApiResponse(response, schema) {
        if (!response) return null;
        
        // Basic type checking
        if (schema.type === 'array' && !Array.isArray(response)) {
            console.warn('Expected array, got:', typeof response);
            return [];
        }
        
        if (schema.type === 'object' && typeof response !== 'object') {
            console.warn('Expected object, got:', typeof response);
            return {};
        }
        
        // Validate required fields
        if (schema.required && Array.isArray(schema.required)) {
            for (const field of schema.required) {
                if (!(field in response)) {
                    console.warn(`Missing required field: ${field}`);
                    return null;
                }
            }
        }
        
        return response;
    }
    
    // Safe error message extractor
    function normalizeError(err) {
        if (!err) return 'Unknown error';
        
        // Handle different error types
        if (typeof err === 'string') return err;
        if (err instanceof Error) return err.message || err.toString();
        if (err.message) return String(err.message);
        if (err.error) return normalizeError(err.error);
        if (err.reason) return String(err.reason);
        
        // Try to stringify if object
        try {
            const str = JSON.stringify(err);
            if (str && str !== '{}') return str;
        } catch (e) {
            // Ignore stringify errors
        }
        
        return 'Unknown error';
    }
    
    // Number validator with defaults
    function validateNumber(value, defaultValue = 0, min = null, max = null) {
        const num = Number(value);
        
        if (isNaN(num)) return defaultValue;
        if (min !== null && num < min) return min;
        if (max !== null && num > max) return max;
        
        return num;
    }
    
    // Guest count validator
    function validateGuestCounts(counts) {
        if (!counts || typeof counts !== 'object') {
            return {
                adults: 1,
                children: 0,
                infants: 0,
                pets: 0
            };
        }
        
        return {
            adults: validateNumber(counts.adults, 1, 1, 16),
            children: validateNumber(counts.children, 0, 0, 15),
            infants: validateNumber(counts.infants, 0, 0, 5),
            pets: validateNumber(counts.pets, 0, 0, 5)
        };
    }
    
    // Debounced function creator
    function createDebounced(fn, delay = 250) {
        let timeoutId = null;
        
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                fn.apply(this, args);
            }, delay);
        };
    }
    
    // Safe DOM query with null check
    function safeQuerySelector(selector, parent = document) {
        try {
            const element = parent.querySelector(selector);
            if (!element) {
                console.debug(`Element not found: ${selector}`);
            }
            return element;
        } catch (e) {
            console.error(`Invalid selector: ${selector}`, e);
            return null;
        }
    }
    
    // Safe DOM query all
    function safeQuerySelectorAll(selector, parent = document) {
        try {
            return Array.from(parent.querySelectorAll(selector));
        } catch (e) {
            console.error(`Invalid selector: ${selector}`, e);
            return [];
        }
    }
    
    // Flight search input validator
    function validateFlightSearch(params) {
        const errors = [];
        const validated = {
            origin: '',
            destination: '',
            departDate: null,
            returnDate: null,
            passengers: 1,
            tripId: null
        };
        
        if (!params || typeof params !== 'object') {
            errors.push('Invalid search parameters');
            return { valid: false, errors, data: validated };
        }
        
        // Validate origin
        if (!params.origin || params.origin.trim().length < 2) {
            errors.push('Origin city or airport is required');
        } else {
            validated.origin = params.origin.trim();
        }
        
        // Validate destination
        if (!params.destination || params.destination.trim().length < 2) {
            errors.push('Destination city or airport is required');
        } else {
            validated.destination = params.destination.trim();
        }
        
        // Validate dates
        if (!params.departDate) {
            errors.push('Departure date is required');
        } else {
            const date = new Date(params.departDate);
            if (isNaN(date.getTime())) {
                errors.push('Invalid departure date');
            } else if (date < new Date().setHours(0, 0, 0, 0)) {
                errors.push('Departure date cannot be in the past');
            } else {
                validated.departDate = date.toISOString().split('T')[0];
            }
        }
        
        // Optional return date validation
        if (params.returnDate) {
            const returnDate = new Date(params.returnDate);
            if (isNaN(returnDate.getTime())) {
                errors.push('Invalid return date');
            } else if (validated.departDate && returnDate < new Date(validated.departDate)) {
                errors.push('Return date must be after departure date');
            } else {
                validated.returnDate = returnDate.toISOString().split('T')[0];
            }
        }
        
        // Validate passengers
        validated.passengers = validateNumber(params.passengers, 1, 1, 9);
        
        // Optional trip ID
        if (params.tripId) {
            validated.tripId = String(params.tripId);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            data: validated
        };
    }
    
    // Debounced search button handler
    function createSearchDebouncer(searchFn, delay = 500) {
        let timeoutId = null;
        let lastCallTime = 0;
        
        return function(...args) {
            const now = Date.now();
            const timeSinceLastCall = now - lastCallTime;
            
            // Prevent rapid successive calls
            if (timeSinceLastCall < delay) {
                clearTimeout(timeoutId);
                console.log('[Search] Debouncing - too soon since last call');
                
                timeoutId = setTimeout(() => {
                    lastCallTime = Date.now();
                    searchFn.apply(this, args);
                }, delay - timeSinceLastCall);
            } else {
                // Execute immediately if enough time has passed
                clearTimeout(timeoutId);
                lastCallTime = now;
                searchFn.apply(this, args);
            }
        };
    }
    
    // Export to window
    window.validators = {
        validateFlightData,
        validateLocationData,
        validateApiResponse,
        normalizeError,
        validateNumber,
        validateGuestCounts,
        createDebounced,
        safeQuerySelector,
        safeQuerySelectorAll,
        validateFlightSearch,
        createSearchDebouncer
    };
    
    console.log('[Validators] Runtime validation utilities loaded');
})();