// Configuration for API endpoints and services
const CONFIG = {
    // API Base URL - automatically detect based on environment
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : window.location.origin,
    
    // Feature flags for external services
    FEATURES: {
        GOOGLE_PLACES: false, // Set to true when API key is configured
        TICKETMASTER_EVENTS: false, // Set to true when API key is configured
        FLIGHT_SEARCH: false, // Set to true when Amadeus is configured
        REAL_TIME_UPDATES: true, // Socket.io real-time features
    },
    
    // Error handling
    SHOW_ERROR_DETAILS: window.location.hostname === 'localhost',
    
    // Fallback data when APIs are unavailable
    USE_MOCK_DATA: true,
    
    // Retry configuration
    API_RETRY_ATTEMPTS: 3,
    API_RETRY_DELAY: 1000, // milliseconds
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}