// Production Configuration for AWS Amplify
(function() {
    'use strict';
    
    // Safe localStorage wrapper
    window.safeStorage = {
        getItem: function(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.warn('localStorage not available:', e);
                return null;
            }
        },
        setItem: function(key, value) {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
                return false;
            }
        },
        removeItem: function(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('Failed to remove from localStorage:', e);
                return false;
            }
        }
    };
    
    // Override API calls that would go to server
    window.productionMode = {
        isProduction: window.location.hostname !== 'localhost',
        
        // Mock API responses for production
        mockApiCall: function(endpoint, options) {
            console.log('Production mode - API call simulated:', endpoint);
            
            // Return mock successful responses
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: [],
                    message: 'Production mode - using local storage'
                })
            });
        },
        
        // Handle missing server endpoints
        handleMissingEndpoint: function(error) {
            console.log('Server endpoint not available in production');
            // Fail silently in production
            return null;
        }
    };
    
    // Override fetch for production
    if (window.productionMode.isProduction) {
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            // Allow external APIs (Google, etc)
            if (url.startsWith('http') && !url.includes(window.location.hostname)) {
                return originalFetch(url, options);
            }
            
            // Mock internal API calls
            if (url.includes('/api/') || url.includes('localhost')) {
                return window.productionMode.mockApiCall(url, options);
            }
            
            // Allow other requests
            return originalFetch(url, options);
        };
    }
    
    // Disable console errors in production
    if (window.productionMode.isProduction) {
        const originalError = console.error;
        console.error = function(...args) {
            // Filter out known production errors
            const errorString = args.join(' ');
            if (errorString.includes('socket.io') || 
                errorString.includes('Socket') ||
                errorString.includes('Failed to fetch') ||
                errorString.includes('NetworkError')) {
                return; // Suppress these errors
            }
            originalError.apply(console, args);
        };
    }
    
    // Initialize production defaults
    window.addEventListener('DOMContentLoaded', function() {
        // Set default trip if none exists
        const currentTrip = window.safeStorage.getItem('currentTrip');
        if (!currentTrip) {
            const defaultTrip = {
                id: 'trip-' + Date.now(),
                destination: '',
                startDate: '',
                endDate: '',
                travelers: 1,
                createdAt: new Date().toISOString()
            };
            window.safeStorage.setItem('currentTrip', JSON.stringify(defaultTrip));
            window.safeStorage.setItem('currentTripId', defaultTrip.id);
        }
        
        console.log('Production mode initialized');
    });
})();