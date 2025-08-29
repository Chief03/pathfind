/**
 * Flight Data Model
 * Complete specification for flight tracking in trip planning
 */

// Flight model schema
const FlightSchema = {
    // Core fields (required)
    id: {
        type: 'string',
        required: true,
        description: 'Unique flight identifier (UUID or timestamp-based)'
    },
    tripId: {
        type: 'string',
        required: true,
        description: 'Associated trip ID',
        index: true
    },
    userId: {
        type: 'string',
        required: true,
        description: 'Owner user ID who created the flight',
        index: true
    },
    
    // Flight details (required)
    airline: {
        type: 'string',
        required: true,
        minLength: 2,
        maxLength: 100,
        description: 'Airline name or code (e.g., "American Airlines" or "AA")'
    },
    flightNumber: {
        type: 'string',
        required: false,
        maxLength: 10,
        pattern: /^[A-Z0-9]{2,3}\d{1,5}$/,
        description: 'Flight number (e.g., "AA1234")'
    },
    arrivalDateTime: {
        type: 'string',
        required: true,
        format: 'date-time',
        description: 'ISO 8601 UTC arrival time'
    },
    departureAirport: {
        type: 'string',
        required: true,
        length: 3,
        pattern: /^[A-Z]{3}$/,
        description: 'Departure IATA code (e.g., "JFK")'
    },
    arrivalAirport: {
        type: 'string',
        required: true,
        length: 3,
        pattern: /^[A-Z]{3}$/,
        description: 'Arrival/destination IATA code (e.g., "LAX")'
    },
    
    // Optional fields
    friendId: {
        type: 'string',
        required: false,
        description: 'Friend user ID if flight is for someone else',
        index: true
    },
    travelerName: {
        type: 'string',
        required: true,
        description: 'Display name of traveler'
    },
    notes: {
        type: 'string',
        required: false,
        maxLength: 500,
        description: 'Optional notes (terminal, gate, seat, etc.)'
    },
    confirmationNumber: {
        type: 'string',
        required: false,
        maxLength: 20,
        description: 'Booking confirmation number'
    },
    seatNumber: {
        type: 'string',
        required: false,
        maxLength: 5,
        description: 'Seat assignment (e.g., "12A")'
    },
    terminal: {
        type: 'string',
        required: false,
        maxLength: 10,
        description: 'Terminal information'
    },
    gate: {
        type: 'string',
        required: false,
        maxLength: 10,
        description: 'Gate information'
    },
    
    // Metadata
    createdAt: {
        type: 'string',
        required: true,
        format: 'date-time',
        description: 'ISO 8601 UTC creation timestamp'
    },
    updatedAt: {
        type: 'string',
        required: true,
        format: 'date-time',
        description: 'ISO 8601 UTC last update timestamp'
    },
    createdBy: {
        type: 'string',
        required: true,
        description: 'User ID who created the flight'
    },
    updatedBy: {
        type: 'string',
        required: false,
        description: 'User ID who last updated the flight'
    },
    
    // Status and flags
    status: {
        type: 'string',
        enum: ['scheduled', 'delayed', 'cancelled', 'completed'],
        default: 'scheduled',
        description: 'Flight status'
    },
    isGroupFlight: {
        type: 'boolean',
        default: false,
        description: 'Whether multiple trip members are on this flight'
    },
    guestUserIds: {
        type: 'array',
        items: { type: 'string' },
        default: [],
        description: 'Additional users on this flight'
    }
};

// Flight validation rules
const FlightValidation = {
    // Required field validation
    validateRequired(flight) {
        const errors = [];
        const required = ['tripId', 'userId', 'airline', 'arrivalDateTime', 'departureAirport', 'arrivalAirport', 'travelerName'];
        
        for (const field of required) {
            if (!flight[field]) {
                errors.push(`${field} is required`);
            }
        }
        
        return errors;
    },
    
    // Airport code validation
    validateAirportCode(code) {
        if (!code) return 'Airport code is required';
        if (!/^[A-Z]{3}$/.test(code.toUpperCase())) {
            return 'Airport code must be 3 letters (IATA format)';
        }
        return null;
    },
    
    // Date/time validation
    validateArrivalTime(dateTime) {
        if (!dateTime) return 'Arrival time is required';
        
        const date = new Date(dateTime);
        if (isNaN(date.getTime())) {
            return 'Invalid date/time format';
        }
        
        // Allow past dates for historical flights but warn
        const now = new Date();
        if (date < now) {
            console.warn('Flight arrival time is in the past');
        }
        
        return null;
    },
    
    // Flight number validation (optional)
    validateFlightNumber(flightNumber) {
        if (!flightNumber) return null; // Optional field
        
        // Format: 2-3 letter airline code + 1-5 digits
        if (!/^[A-Z]{2,3}\d{1,5}$/i.test(flightNumber)) {
            return 'Invalid flight number format (e.g., AA1234)';
        }
        
        return null;
    },
    
    // Complete flight validation
    validate(flight) {
        const errors = [];
        
        // Check required fields
        errors.push(...this.validateRequired(flight));
        
        // Validate airport codes
        const depError = this.validateAirportCode(flight.departureAirport);
        if (depError) errors.push(`Departure: ${depError}`);
        
        const arrError = this.validateAirportCode(flight.arrivalAirport);
        if (arrError) errors.push(`Arrival: ${arrError}`);
        
        // Validate arrival time
        const timeError = this.validateArrivalTime(flight.arrivalDateTime);
        if (timeError) errors.push(timeError);
        
        // Validate flight number if provided
        if (flight.flightNumber) {
            const fnError = this.validateFlightNumber(flight.flightNumber);
            if (fnError) errors.push(fnError);
        }
        
        // Check airports are different
        if (flight.departureAirport === flight.arrivalAirport) {
            errors.push('Departure and arrival airports must be different');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
};

// Flight permissions
const FlightPermissions = {
    // Check if user can create flight
    canCreate(userId, tripMembers) {
        return tripMembers.includes(userId);
    },
    
    // Check if user can read flight
    canRead(userId, flight, tripMembers) {
        return tripMembers.includes(userId);
    },
    
    // Check if user can update flight
    canUpdate(userId, flight, tripMembers, isAdmin = false) {
        // Admin can update any flight
        if (isAdmin) return true;
        
        // Owner can update their flight
        if (flight.userId === userId) return true;
        
        // Friend can update if tagged
        if (flight.friendId === userId) return true;
        
        // Guest users can update if tagged
        if (flight.guestUserIds && flight.guestUserIds.includes(userId)) return true;
        
        return false;
    },
    
    // Check if user can delete flight
    canDelete(userId, flight, isAdmin = false) {
        // Only owner or admin can delete
        return flight.userId === userId || isAdmin;
    },
    
    // Check if user can assign flight to friend
    canAssignToFriend(userId, friendId, tripMembers) {
        // Both must be trip members
        return tripMembers.includes(userId) && tripMembers.includes(friendId);
    }
};

// Flight data transformers
const FlightTransformers = {
    // Normalize flight data for storage
    normalizeForStorage(flight) {
        const normalized = { ...flight };
        
        // Normalize airport codes to uppercase
        if (normalized.departureAirport) {
            normalized.departureAirport = normalized.departureAirport.toUpperCase();
        }
        if (normalized.arrivalAirport) {
            normalized.arrivalAirport = normalized.arrivalAirport.toUpperCase();
        }
        
        // Normalize flight number
        if (normalized.flightNumber) {
            normalized.flightNumber = normalized.flightNumber.toUpperCase().replace(/\s+/g, '');
        }
        
        // Ensure ISO format for dates
        if (normalized.arrivalDateTime && !(normalized.arrivalDateTime instanceof Date)) {
            normalized.arrivalDateTime = new Date(normalized.arrivalDateTime).toISOString();
        }
        
        // Add metadata
        const now = new Date().toISOString();
        if (!normalized.createdAt) {
            normalized.createdAt = now;
        }
        normalized.updatedAt = now;
        
        // Generate ID if not provided
        if (!normalized.id) {
            normalized.id = 'flight_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        return normalized;
    },
    
    // Transform for API response
    forApiResponse(flight) {
        const response = { ...flight };
        
        // Add computed fields
        response.displayTime = this.formatArrivalTime(flight.arrivalDateTime);
        response.displayRoute = `${flight.departureAirport} → ${flight.arrivalAirport}`;
        
        // Add traveler info
        if (flight.friendId || flight.guestUserIds?.length > 0) {
            response.isSharedFlight = true;
        }
        
        return response;
    },
    
    // Format arrival time for display
    formatArrivalTime(dateTime) {
        const date = new Date(dateTime);
        return {
            date: date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            }),
            time: date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            }),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    },
    
    // Group flights by date
    groupByDate(flights) {
        const grouped = {};
        
        flights.forEach(flight => {
            const date = new Date(flight.arrivalDateTime).toDateString();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(flight);
        });
        
        // Sort flights within each date
        Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) => 
                new Date(a.arrivalDateTime) - new Date(b.arrivalDateTime)
            );
        });
        
        return grouped;
    }
};

// Export for ES modules
export {
    FlightSchema,
    FlightValidation,
    FlightPermissions,
    FlightTransformers
};

// Also expose to window for browser usage
if (typeof window !== 'undefined') {
    window.FlightModel = {
        FlightSchema,
        FlightValidation,
        FlightPermissions,
        FlightTransformers
    };
}