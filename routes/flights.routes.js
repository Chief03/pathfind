/**
 * Flight API Routes
 * RESTful endpoints for flight CRUD operations
 */

const express = require('express');
const router = express.Router();
const { 
    FlightValidation, 
    FlightPermissions, 
    FlightTransformers 
} = require('../models/flight.model');

// In-memory storage (replace with database in production)
const flightsDB = new Map();
const tripMembersDB = new Map(); // tripId -> [userId]

// Middleware to validate authentication
function requireAuth(req, res, next) {
    // In production, verify JWT token
    const userId = req.headers['x-user-id'] || req.query.userId || 'user1'; // Default for development
    req.userId = userId;
    next();
}

// Middleware to check trip membership
async function requireTripMember(req, res, next) {
    const { tripId } = req.params;
    const userId = req.userId;
    
    // Get trip members (in production, query database)
    let members = tripMembersDB.get(tripId) || [];
    
    // In development, auto-add user to trip if not a member
    if (!members.includes(userId)) {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Not a member of this trip' });
        } else {
            // Auto-add in development
            members.push(userId);
            tripMembersDB.set(tripId, members);
        }
    }
    
    req.tripMembers = members;
    next();
}

/**
 * GET /api/trips/:tripId/flights
 * Get all flights for a trip
 */
router.get('/trips/:tripId/flights', requireAuth, requireTripMember, async (req, res) => {
    try {
        const { tripId } = req.params;
        const { sortBy = 'arrivalDateTime', groupByDate = 'false' } = req.query;
        
        // Get all flights for trip
        const allFlights = Array.from(flightsDB.values());
        const tripFlights = allFlights.filter(f => f.tripId === tripId);
        
        // Sort flights
        tripFlights.sort((a, b) => {
            if (sortBy === 'arrivalDateTime') {
                return new Date(a.arrivalDateTime) - new Date(b.arrivalDateTime);
            }
            return 0;
        });
        
        // Transform for response
        const transformed = tripFlights.map(f => FlightTransformers.forApiResponse(f));
        
        // Group by date if requested
        const response = groupByDate === 'true' 
            ? FlightTransformers.groupByDate(transformed)
            : transformed;
        
        res.json({
            success: true,
            data: response,
            count: tripFlights.length
        });
        
    } catch (error) {
        console.error('Error fetching flights:', error);
        res.status(500).json({ error: 'Failed to fetch flights' });
    }
});

/**
 * GET /api/flights/:id
 * Get a specific flight
 */
router.get('/flights/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const flight = flightsDB.get(id);
        
        if (!flight) {
            return res.status(404).json({ error: 'Flight not found' });
        }
        
        // Check permissions
        const members = tripMembersDB.get(flight.tripId) || [];
        if (!FlightPermissions.canRead(req.userId, flight, members)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        res.json({
            success: true,
            data: FlightTransformers.forApiResponse(flight)
        });
        
    } catch (error) {
        console.error('Error fetching flight:', error);
        res.status(500).json({ error: 'Failed to fetch flight' });
    }
});

/**
 * POST /api/trips/:tripId/flights
 * Create a new flight
 */
router.post('/trips/:tripId/flights', requireAuth, requireTripMember, async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.userId;
        const flightData = req.body;
        
        // Set required fields
        flightData.tripId = tripId;
        flightData.userId = userId;
        flightData.createdBy = userId;
        
        // Validate flight data
        const validation = FlightValidation.validate(flightData);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: validation.errors 
            });
        }
        
        // Check permission to assign to friend
        if (flightData.friendId) {
            if (!FlightPermissions.canAssignToFriend(userId, flightData.friendId, req.tripMembers)) {
                return res.status(403).json({ 
                    error: 'Cannot assign flight to non-member' 
                });
            }
        }
        
        // Normalize and save
        const normalized = FlightTransformers.normalizeForStorage(flightData);
        flightsDB.set(normalized.id, normalized);
        
        // Log audit trail
        console.log(`[AUDIT] User ${userId} created flight ${normalized.id} for trip ${tripId}`);
        
        // Return created flight
        res.status(201).json({
            success: true,
            data: FlightTransformers.forApiResponse(normalized)
        });
        
        // Emit real-time update (if using Socket.io)
        if (req.app.locals.io) {
            req.app.locals.io.to(`trip-${tripId}`).emit('flight-created', normalized);
        }
        
    } catch (error) {
        console.error('Error creating flight:', error);
        res.status(500).json({ error: 'Failed to create flight' });
    }
});

/**
 * PUT /api/flights/:id
 * Update a flight
 */
router.put('/flights/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const updates = req.body;
        
        // Get existing flight
        const existingFlight = flightsDB.get(id);
        if (!existingFlight) {
            return res.status(404).json({ error: 'Flight not found' });
        }
        
        // Check permissions
        const members = tripMembersDB.get(existingFlight.tripId) || [];
        const isAdmin = req.headers['x-is-admin'] === 'true'; // In production, check from auth
        
        if (!FlightPermissions.canUpdate(userId, existingFlight, members, isAdmin)) {
            return res.status(403).json({ error: 'Not authorized to update this flight' });
        }
        
        // Merge updates
        const updatedFlight = {
            ...existingFlight,
            ...updates,
            id: existingFlight.id, // Prevent ID change
            tripId: existingFlight.tripId, // Prevent trip change
            userId: existingFlight.userId, // Prevent owner change
            createdAt: existingFlight.createdAt, // Preserve creation time
            updatedBy: userId,
            updatedAt: new Date().toISOString()
        };
        
        // Validate updated flight
        const validation = FlightValidation.validate(updatedFlight);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: validation.errors 
            });
        }
        
        // Save updated flight
        const normalized = FlightTransformers.normalizeForStorage(updatedFlight);
        flightsDB.set(id, normalized);
        
        // Log audit trail
        console.log(`[AUDIT] User ${userId} updated flight ${id}`);
        
        res.json({
            success: true,
            data: FlightTransformers.forApiResponse(normalized)
        });
        
        // Emit real-time update
        if (req.app.locals.io) {
            req.app.locals.io.to(`trip-${existingFlight.tripId}`).emit('flight-updated', normalized);
        }
        
    } catch (error) {
        console.error('Error updating flight:', error);
        res.status(500).json({ error: 'Failed to update flight' });
    }
});

/**
 * PATCH /api/flights/:id
 * Partial update of a flight
 */
router.patch('/flights/:id', requireAuth, async (req, res) => {
    // Delegate to PUT with partial updates
    return router.handle({ ...req, method: 'PUT' }, res);
});

/**
 * DELETE /api/flights/:id
 * Delete a flight
 */
router.delete('/flights/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        // Get existing flight
        const existingFlight = flightsDB.get(id);
        if (!existingFlight) {
            return res.status(404).json({ error: 'Flight not found' });
        }
        
        // Check permissions
        const isAdmin = req.headers['x-is-admin'] === 'true';
        if (!FlightPermissions.canDelete(userId, existingFlight, isAdmin)) {
            return res.status(403).json({ error: 'Not authorized to delete this flight' });
        }
        
        // Delete flight
        flightsDB.delete(id);
        
        // Log audit trail
        console.log(`[AUDIT] User ${userId} deleted flight ${id}`);
        
        res.json({
            success: true,
            message: 'Flight deleted successfully'
        });
        
        // Emit real-time update
        if (req.app.locals.io) {
            req.app.locals.io.to(`trip-${existingFlight.tripId}`).emit('flight-deleted', { 
                flightId: id,
                tripId: existingFlight.tripId 
            });
        }
        
    } catch (error) {
        console.error('Error deleting flight:', error);
        res.status(500).json({ error: 'Failed to delete flight' });
    }
});

/**
 * POST /api/flights/bulk
 * Create multiple flights at once
 */
router.post('/flights/bulk', requireAuth, async (req, res) => {
    try {
        const { flights } = req.body;
        const userId = req.userId;
        
        if (!Array.isArray(flights)) {
            return res.status(400).json({ error: 'Flights must be an array' });
        }
        
        const created = [];
        const errors = [];
        
        for (const flightData of flights) {
            // Check trip membership
            const members = tripMembersDB.get(flightData.tripId) || [];
            if (!members.includes(userId)) {
                errors.push({
                    flight: flightData,
                    error: 'Not a member of trip'
                });
                continue;
            }
            
            // Validate and create
            flightData.userId = userId;
            flightData.createdBy = userId;
            
            const validation = FlightValidation.validate(flightData);
            if (!validation.valid) {
                errors.push({
                    flight: flightData,
                    error: validation.errors
                });
                continue;
            }
            
            const normalized = FlightTransformers.normalizeForStorage(flightData);
            flightsDB.set(normalized.id, normalized);
            created.push(normalized);
        }
        
        res.json({
            success: true,
            created: created.length,
            errors: errors.length,
            data: {
                created: created.map(f => FlightTransformers.forApiResponse(f)),
                errors
            }
        });
        
    } catch (error) {
        console.error('Error creating bulk flights:', error);
        res.status(500).json({ error: 'Failed to create flights' });
    }
});

/**
 * GET /api/flights/search
 * Search flights across trips
 */
router.get('/flights/search', requireAuth, async (req, res) => {
    try {
        const { airline, airport, date, userId: searchUserId } = req.query;
        const userId = req.userId;
        
        // Get all user's trips
        const userTrips = [];
        tripMembersDB.forEach((members, tripId) => {
            if (members.includes(userId)) {
                userTrips.push(tripId);
            }
        });
        
        // Search flights
        let results = Array.from(flightsDB.values()).filter(f => 
            userTrips.includes(f.tripId)
        );
        
        // Apply filters
        if (airline) {
            results = results.filter(f => 
                f.airline.toLowerCase().includes(airline.toLowerCase())
            );
        }
        
        if (airport) {
            const code = airport.toUpperCase();
            results = results.filter(f => 
                f.departureAirport === code || f.arrivalAirport === code
            );
        }
        
        if (date) {
            const searchDate = new Date(date).toDateString();
            results = results.filter(f => 
                new Date(f.arrivalDateTime).toDateString() === searchDate
            );
        }
        
        if (searchUserId) {
            results = results.filter(f => 
                f.userId === searchUserId || f.friendId === searchUserId
            );
        }
        
        res.json({
            success: true,
            data: results.map(f => FlightTransformers.forApiResponse(f)),
            count: results.length
        });
        
    } catch (error) {
        console.error('Error searching flights:', error);
        res.status(500).json({ error: 'Failed to search flights' });
    }
});

// Helper function to seed sample data (for development)
function seedSampleData() {
    // Add sample trip members
    tripMembersDB.set('TRIP123', ['user1', 'user2', 'user3']);
    
    // Add sample flights
    const sampleFlights = [
        {
            id: 'flight1',
            tripId: 'TRIP123',
            userId: 'user1',
            airline: 'American Airlines',
            flightNumber: 'AA100',
            arrivalDateTime: new Date(Date.now() + 86400000).toISOString(),
            departureAirport: 'JFK',
            arrivalAirport: 'LAX',
            travelerName: 'John Doe',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'flight2',
            tripId: 'TRIP123',
            userId: 'user1',
            friendId: 'user2',
            airline: 'United',
            flightNumber: 'UA200',
            arrivalDateTime: new Date(Date.now() + 172800000).toISOString(),
            departureAirport: 'LAX',
            arrivalAirport: 'JFK',
            travelerName: 'Jane Smith',
            notes: 'Terminal 2, Gate A5',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    
    sampleFlights.forEach(f => {
        flightsDB.set(f.id, FlightTransformers.normalizeForStorage(f));
    });
    
    console.log('[Flights] Sample data seeded');
}

// Seed data on startup (development only)
if (process.env.NODE_ENV !== 'production') {
    seedSampleData();
}

module.exports = router;