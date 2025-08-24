require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const EventsAPI = require('./services/events-api');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Initialize Events API
const eventsAPI = new EventsAPI();

// Cache for places autocomplete
const placesCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory storage (in production, use a database)
const users = new Map();
const trips = new Map();
const tripCodes = new Map(); // Map codes to tripIds
const flights = new Map(); // Store flights by tripId
const activeUsers = new Map();

// Helper function to generate shareable trip codes
function generateTripCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    do {
        code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (tripCodes.has(code)); // Ensure uniqueness
    return code;
}

// Middleware
app.use(express.static('public'));
app.use(express.static('models')); // Serve model files
app.use(express.json());
app.use(cookieParser());

// Store io instance for use in routes
app.locals.io = io;

// Auth middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Import flight routes
const flightRoutes = require('./routes/flights.routes');

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Explicit route for test file (fallback if static serving fails)
app.get('/test-flights-enhanced.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-flights-enhanced.html'));
});

// API Routes
app.use('/api', flightRoutes);

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
    const { email, phone, firstName, lastName, birthdate, password } = req.body;
    
    // Check if user already exists
    if (users.has(email)) {
        return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = uuidv4();
    const user = {
        id: userId,
        email,
        phone,
        firstName,
        lastName,
        birthdate,
        password: hashedPassword,
        createdAt: new Date(),
        trips: []
    };
    
    users.set(email, user);
    
    // Generate token
    const token = jwt.sign(
        { id: userId, email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    
    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Find user
    const user = users.get(email);
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    
    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
});

// Helper function to validate city using OpenStreetMap Nominatim API
async function validateCity(cityName) {
    if (!cityName || cityName.trim().length < 2) {
        return { isValid: false, error: 'City name must be at least 2 characters' };
    }

    try {
        const params = new URLSearchParams({
            q: cityName.trim(),
            format: 'json',
            limit: '5',
            addressdetails: '1',
            countrycodes: 'us', // Limit to US cities
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            {
                headers: {
                    'User-Agent': 'Pathfind Trip Planner', // Required by Nominatim
                },
            }
        );

        if (!response.ok) {
            return { isValid: false, error: 'Unable to validate city' };
        }

        const results = await response.json();
        
        // Filter for actual cities/towns
        const cityResults = results.filter(r => 
            r.type === 'city' || 
            r.type === 'town' || 
            r.type === 'administrative' ||
            (r.address && (r.address.city || r.address.town))
        );

        if (cityResults.length === 0) {
            return { 
                isValid: false, 
                error: `"${cityName}" is not a valid city. Please enter a real city name.` 
            };
        }

        const bestMatch = cityResults[0];
        const city = bestMatch.address?.city || bestMatch.address?.town || cityName;
        const state = bestMatch.address?.state || '';
        
        return {
            isValid: true,
            normalizedName: state ? `${city}, ${state}` : city,
            coordinates: {
                lat: parseFloat(bestMatch.lat),
                lng: parseFloat(bestMatch.lon)
            },
            displayName: bestMatch.display_name
        };
    } catch (error) {
        console.error('City validation error:', error);
        return { isValid: false, error: 'Unable to validate city' };
    }
}

// Anonymous trip creation (for demo/MVP)
app.post('/api/trips/create-anonymous', async (req, res) => {
    try {
        // Validate destination city (required)
        const destValidation = await validateCity(req.body.destinationCity);
        if (!destValidation.isValid) {
            return res.status(400).json({ 
                error: destValidation.error || 'Invalid destination city' 
            });
        }

        // Validate departure city if provided
        let depValidation = null;
        if (req.body.departureCity) {
            depValidation = await validateCity(req.body.departureCity);
            if (!depValidation.isValid) {
                return res.status(400).json({ 
                    error: `Departure city: ${depValidation.error}` 
                });
            }
        }

        const tripId = uuidv4();
        const shareCode = generateTripCode();
        
        const trip = {
            id: tripId,
            shareCode: shareCode,
            name: req.body.name || 'New Trip',
            departureCity: depValidation ? depValidation.normalizedName : '',
            destinationCity: destValidation.normalizedName,
            departureCoords: depValidation ? depValidation.coordinates : null,
            destinationCoords: destValidation.coordinates,
            startDate: req.body.startDate || null,
            endDate: req.body.endDate || null,
            groupSize: req.body.groupSize || 2,
            description: req.body.description || '',
            creatorId: 'anonymous',
            participants: [{
                id: 'anonymous',
                email: 'guest@pathfind.app',
                name: 'Trip Creator',
                role: 'creator'
            }],
            itinerary: [],
            budget: {},
            places: [],
            createdAt: new Date()
        };
        
        trips.set(tripId, trip);
        tripCodes.set(shareCode, tripId); // Map code to trip ID
        
        res.json(trip);
    } catch (error) {
        console.error('Trip creation error:', error);
        res.status(500).json({ error: 'Failed to create trip' });
    }
});

// Trip routes
app.post('/api/trips', authenticateToken, async (req, res) => {
    try {
        // Validate destination city (required)
        const destValidation = await validateCity(req.body.destinationCity);
        if (!destValidation.isValid) {
            return res.status(400).json({ 
                error: destValidation.error || 'Invalid destination city' 
            });
        }

        // Validate departure city if provided
        let depValidation = null;
        if (req.body.departureCity) {
            depValidation = await validateCity(req.body.departureCity);
            if (!depValidation.isValid) {
                return res.status(400).json({ 
                    error: `Departure city: ${depValidation.error}` 
                });
            }
        }

        const tripId = uuidv4();
        const shareCode = generateTripCode();
        
        const trip = {
            id: tripId,
            shareCode: shareCode,
            name: req.body.name || 'New Trip',
            departureCity: depValidation ? depValidation.normalizedName : '',
            destinationCity: destValidation.normalizedName,
            departureCoords: depValidation ? depValidation.coordinates : null,
            destinationCoords: destValidation.coordinates,
        startDate: req.body.startDate || null,
        endDate: req.body.endDate || null,
        groupSize: req.body.groupSize || 2,
        description: req.body.description || '',
        creatorId: req.user.id,
        participants: [{
            id: req.user.id,
            email: req.user.email,
            name: `${users.get(req.user.email).firstName} ${users.get(req.user.email).lastName}`,
            role: 'creator'
        }],
        itinerary: [],
        budget: {},
        places: [],
        createdAt: new Date()
    };
    
    trips.set(tripId, trip);
    tripCodes.set(shareCode, tripId); // Map code to trip ID
    
        // Add trip to user's trips
        const user = users.get(req.user.email);
        if (user) {
            user.trips.push(tripId);
        }
        
        res.json(trip);
    } catch (error) {
        console.error('Trip creation error:', error);
        res.status(500).json({ error: 'Failed to create trip' });
    }
});

app.get('/api/trips/user', authenticateToken, (req, res) => {
    const user = users.get(req.user.email);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const userTrips = user.trips
        .map(tripId => trips.get(tripId))
        .filter(trip => trip !== undefined);
    
    res.json(userTrips);
});

app.get('/api/trips/:id', authenticateToken, (req, res) => {
    const trip = trips.get(req.params.id);
    if (trip) {
        // Check if user is a participant
        const isParticipant = trip.participants.some(p => p.id === req.user.id);
        if (!isParticipant) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(trip);
    } else {
        res.status(404).json({ error: 'Trip not found' });
    }
});

app.post('/api/trips/:id/join', authenticateToken, (req, res) => {
    const trip = trips.get(req.params.id);
    if (!trip) {
        return res.status(404).json({ error: 'Trip not found' });
    }
    
    // Check if already a participant
    const isParticipant = trip.participants.some(p => p.id === req.user.id);
    if (isParticipant) {
        return res.status(400).json({ error: 'Already a participant' });
    }
    
    // Add user as participant
    const user = users.get(req.user.email);
    trip.participants.push({
        id: req.user.id,
        email: req.user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: 'participant'
    });
    
    // Add trip to user's trips
    user.trips.push(trip.id);
    
    res.json(trip);
});

// Join trip by code (no auth required for anonymous users)
app.post('/api/trips/join-code', (req, res) => {
    const { code, userName } = req.body;
    
    if (!code) {
        return res.status(400).json({ error: 'Trip code is required' });
    }
    
    // Find trip by code
    const tripId = tripCodes.get(code.toUpperCase());
    if (!tripId) {
        return res.status(404).json({ error: 'Invalid trip code' });
    }
    
    const trip = trips.get(tripId);
    if (!trip) {
        return res.status(404).json({ error: 'Trip not found' });
    }
    
    // For anonymous users, just return trip info
    // In production, you might want to track anonymous participants
    res.json({
        tripId: trip.id,
        name: trip.name,
        destination: trip.destinationCity,
        startDate: trip.startDate,
        endDate: trip.endDate,
        participantCount: trip.participants.length
    });
});

app.put('/api/trips/:id', authenticateToken, (req, res) => {
    const trip = trips.get(req.params.id);
    if (!trip) {
        return res.status(404).json({ error: 'Trip not found' });
    }
    
    // Check if user is a participant
    const isParticipant = trip.participants.some(p => p.id === req.user.id);
    if (!isParticipant) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update trip fields
    Object.assign(trip, req.body);
    
    res.json(trip);
});

// Activities routes
app.get('/api/activities', async (req, res) => {
    const { city, start, end } = req.query;
    
    if (!city) {
        return res.status(400).json({ error: 'City parameter is required' });
    }
    
    try {
        // Get curated activities first
        const curatedActivities = getCuratedActivities(city);
        
        // Try to fetch from APIs (would need API keys in production)
        const apiActivities = await fetchActivitiesFromAPIs(city, start, end);
        
        // Combine and dedupe
        const allActivities = [...curatedActivities, ...apiActivities];
        const uniqueActivities = dedupeActivities(allActivities);
        
        res.json({
            city: city,
            items: uniqueActivities.slice(0, 50) // Limit to 50 activities
        });
    } catch (error) {
        console.error('Activities fetch error:', error);
        // Fallback to curated only
        res.json({
            city: city,
            items: getCuratedActivities(city)
        });
    }
});

// Helper functions for activities
function getCuratedActivities(city) {
    const curated = {
        'Paris': [
            {
                id: 'paris-eiffel',
                title: 'Eiffel Tower',
                category: 'Landmark',
                description: 'Iconic iron lattice tower on the Champ de Mars',
                price: 'From $30',
                rating: 4.8,
                address: 'Champ de Mars, 5 Avenue Anatole',
                source: { name: 'Top Pick', url: '' },
                image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f',
                coordinates: { lat: 48.8584, lng: 2.2945 }
            },
            {
                id: 'paris-louvre',
                title: 'Louvre Museum',
                category: 'Museum',
                description: 'World\'s largest art museum',
                price: 'From $20',
                rating: 4.7,
                address: 'Rue de Rivoli',
                source: { name: 'Top Pick', url: '' },
                coordinates: { lat: 48.8606, lng: 2.3376 }
            },
            {
                id: 'paris-notre-dame',
                title: 'Notre-Dame Cathedral',
                category: 'Landmark',
                description: 'Medieval Catholic cathedral',
                price: 'Free',
                rating: 4.6,
                address: '6 Parvis Notre-Dame',
                source: { name: 'Top Pick', url: '' },
                coordinates: { lat: 48.8530, lng: 2.3499 }
            }
        ],
        'Atlanta': [
            {
                id: 'atl-aquarium',
                title: 'Georgia Aquarium',
                category: 'Attraction',
                description: 'One of the largest aquariums in the world',
                price: 'From $40',
                rating: 4.5,
                address: '225 Baker St NW',
                source: { name: 'Top Pick', url: '' },
                coordinates: { lat: 33.7634, lng: -84.3951 }
            },
            {
                id: 'atl-coke',
                title: 'World of Coca-Cola',
                category: 'Museum',
                description: 'Interactive museum about Coca-Cola history',
                price: 'From $20',
                rating: 4.3,
                address: '121 Baker St NW',
                source: { name: 'Top Pick', url: '' },
                coordinates: { lat: 33.7625, lng: -84.3926 }
            }
        ],
        'Cairo': [
            {
                id: 'cairo-pyramids',
                title: 'Pyramids of Giza',
                category: 'Landmark',
                description: 'Ancient pyramid complex including the Great Pyramid',
                price: 'From $15',
                rating: 4.9,
                address: 'Al Haram, Giza',
                source: { name: 'Top Pick', url: '' },
                coordinates: { lat: 29.9792, lng: 31.1342 }
            },
            {
                id: 'cairo-museum',
                title: 'Egyptian Museum',
                category: 'Museum',
                description: 'Home to extensive collection of ancient Egyptian antiquities',
                price: 'From $10',
                rating: 4.6,
                address: 'Tahrir Square',
                source: { name: 'Top Pick', url: '' },
                coordinates: { lat: 30.0478, lng: 31.2336 }
            }
        ],
        'default': [
            {
                id: 'city-tour',
                title: 'City Walking Tour',
                category: 'Tour',
                description: 'Explore the city with a local guide',
                price: 'From $25',
                rating: 4.4,
                source: { name: 'Suggested', url: '' }
            },
            {
                id: 'local-museum',
                title: 'Local History Museum',
                category: 'Museum',
                description: 'Learn about the local culture and history',
                price: 'From $15',
                rating: 4.2,
                source: { name: 'Suggested', url: '' }
            }
        ]
    };
    
    // Find matching city or use default
    const cityLower = city.toLowerCase();
    const cityKey = Object.keys(curated).find(key => 
        cityLower.includes(key.toLowerCase()) || key.toLowerCase().includes(cityLower)
    );
    
    return curated[cityKey] || curated.default;
}

async function fetchActivitiesFromAPIs(city, startDate, endDate) {
    // In production, you would call real APIs here
    // For now, return mock data that simulates API results
    
    const mockApiActivities = [];
    
    // Simulate sports events
    if (Math.random() > 0.5) {
        mockApiActivities.push({
            id: `sport-${Date.now()}`,
            title: `${city} Basketball Game`,
            category: 'Sports',
            description: 'Local team home game',
            startTime: startDate || new Date().toISOString(),
            price: 'From $35',
            rating: 4.3,
            address: 'Sports Arena',
            source: { 
                name: 'Ticketmaster', 
                url: 'https://ticketmaster.com'
            }
        });
    }
    
    // Simulate concerts
    if (Math.random() > 0.6) {
        mockApiActivities.push({
            id: `concert-${Date.now()}`,
            title: 'Live Music at Local Venue',
            category: 'Concert',
            description: 'Popular band performing live',
            startTime: startDate || new Date().toISOString(),
            price: 'From $45',
            rating: 4.5,
            source: { 
                name: 'Eventbrite', 
                url: 'https://eventbrite.com'
            }
        });
    }
    
    return mockApiActivities;
}

function dedupeActivities(activities) {
    const seen = new Set();
    return activities.filter(activity => {
        const key = `${activity.title}-${activity.category}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Flight routes
// GET flights for a trip
app.get('/api/trips/:tripId/flights', (req, res) => {
    const { tripId } = req.params;
    const tripFlights = flights.get(tripId) || [];
    res.json(tripFlights);
});

// POST new flight with structured model
app.post('/api/trips/:tripId/flights', (req, res) => {
    const { tripId } = req.params;
    
    // Structured flight model
    const flight = {
        id: uuidv4(),
        tripId,
        // Core flight info
        airline: req.body.airline || '',
        flightNumber: req.body.flightNumber || '',
        
        // Airport details with timezone
        departureAirport: req.body.departureAirport || { code: '', name: '', city: '', country: '', tz: 'UTC' },
        arrivalAirport: req.body.arrivalAirport || { code: '', name: '', city: '', country: '', tz: 'UTC' },
        
        // Times in ISO format (UTC)
        departureTime: req.body.departureTime || '',
        arrivalTime: req.body.arrivalTime || '',
        
        // Gate/Terminal info
        terminal: req.body.terminal || null,
        gate: req.body.gate || null,
        
        // Additional info
        confirmationCode: req.body.confirmationCode || null,
        notes: req.body.notes || '',
        
        // User tracking
        addedByUserId: req.body.addedByUserId || 'anonymous',
        addedByUserName: req.body.addedByUserName || req.body.travelerName || 'Guest',
        
        // Direction for sorting (arrival/departure relative to trip destination)
        direction: req.body.direction || 'arrival',
        
        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (!flights.has(tripId)) {
        flights.set(tripId, []);
    }
    
    flights.get(tripId).push(flight);
    
    // Broadcast to all trip members
    io.to(tripId).emit('flight-added', flight);
    
    res.status(201).json(flight);
});

// PUT update flight
app.put('/api/trips/:tripId/flights/:flightId', (req, res) => {
    const { tripId, flightId } = req.params;
    const tripFlights = flights.get(tripId);
    
    if (!tripFlights) {
        return res.status(404).json({ error: 'Trip not found' });
    }
    
    const flightIndex = tripFlights.findIndex(f => f.id === flightId);
    if (flightIndex === -1) {
        return res.status(404).json({ error: 'Flight not found' });
    }
    
    const updatedFlight = {
        ...tripFlights[flightIndex],
        ...req.body,
        id: flightId,
        tripId,
        updatedAt: new Date().toISOString()
    };
    
    tripFlights[flightIndex] = updatedFlight;
    
    // Broadcast update
    io.to(tripId).emit('flight-updated', updatedFlight);
    
    res.json(updatedFlight);
});

// DELETE flight
app.delete('/api/trips/:tripId/flights/:flightId', (req, res) => {
    const { tripId, flightId } = req.params;
    const tripFlights = flights.get(tripId);
    
    if (!tripFlights) {
        return res.status(404).json({ error: 'Trip not found' });
    }
    
    const flightIndex = tripFlights.findIndex(f => f.id === flightId);
    if (flightIndex === -1) {
        return res.status(404).json({ error: 'Flight not found' });
    }
    
    tripFlights.splice(flightIndex, 1);
    
    // Broadcast deletion
    io.to(tripId).emit('flight-deleted', { flightId });
    
    res.status(204).send();
});

// Airport search API endpoint
app.get('/api/airports/search', async (req, res) => {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
        return res.json({ airports: [] });
    }
    
    // Major airports database (expandable)
    const airports = [
        { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'USA', tz: 'America/New_York' },
        { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'USA', tz: 'America/Los_Angeles' },
        { code: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'USA', tz: 'America/Chicago' },
        { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'USA', tz: 'America/Chicago' },
        { code: 'DEN', name: 'Denver International', city: 'Denver', country: 'USA', tz: 'America/Denver' },
        { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'USA', tz: 'America/Los_Angeles' },
        { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'USA', tz: 'America/Los_Angeles' },
        { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', country: 'USA', tz: 'America/Los_Angeles' },
        { code: 'MCO', name: 'Orlando International', city: 'Orlando', country: 'USA', tz: 'America/New_York' },
        { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'USA', tz: 'America/New_York' },
        { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', country: 'USA', tz: 'America/New_York' },
        { code: 'BOS', name: 'Logan International', city: 'Boston', country: 'USA', tz: 'America/New_York' },
        { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', country: 'USA', tz: 'America/New_York' },
        { code: 'LGA', name: 'LaGuardia', city: 'New York', country: 'USA', tz: 'America/New_York' },
        { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', country: 'USA', tz: 'America/Phoenix' },
        { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'USA', tz: 'America/Chicago' },
        { code: 'LHR', name: 'Heathrow', city: 'London', country: 'UK', tz: 'Europe/London' },
        { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', tz: 'Europe/Paris' },
        { code: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', tz: 'Europe/Berlin' },
        { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Netherlands', tz: 'Europe/Amsterdam' },
        { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas', city: 'Madrid', country: 'Spain', tz: 'Europe/Madrid' },
        { code: 'BCN', name: 'Barcelona–El Prat', city: 'Barcelona', country: 'Spain', tz: 'Europe/Madrid' },
        { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino', city: 'Rome', country: 'Italy', tz: 'Europe/Rome' },
        { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE', tz: 'Asia/Dubai' },
        { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'China', tz: 'Asia/Hong_Kong' },
        { code: 'NRT', name: 'Narita International', city: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo' },
        { code: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo' },
        { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore' },
        { code: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', tz: 'Australia/Sydney' },
        { code: 'MEL', name: 'Melbourne', city: 'Melbourne', country: 'Australia', tz: 'Australia/Melbourne' },
        { code: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'Canada', tz: 'America/Toronto' },
        { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'Canada', tz: 'America/Vancouver' },
        { code: 'MEX', name: 'Mexico City International', city: 'Mexico City', country: 'Mexico', tz: 'America/Mexico_City' },
        { code: 'GRU', name: 'São Paulo–Guarulhos International', city: 'São Paulo', country: 'Brazil', tz: 'America/Sao_Paulo' },
        { code: 'EZE', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'Argentina', tz: 'America/Argentina/Buenos_Aires' }
    ];
    
    // Search by code, name, or city
    const searchTerm = query.toLowerCase();
    const results = airports.filter(airport => 
        airport.code.toLowerCase().includes(searchTerm) ||
        airport.name.toLowerCase().includes(searchTerm) ||
        airport.city.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
    
    res.json({ airports: results });
});

// Airlines data endpoint
app.get('/api/airlines', (req, res) => {
    const airlines = [
        { code: 'AA', name: 'American Airlines', logo: '🇺🇸' },
        { code: 'DL', name: 'Delta Air Lines', logo: '🔺' },
        { code: 'UA', name: 'United Airlines', logo: '🌐' },
        { code: 'WN', name: 'Southwest Airlines', logo: '❤️' },
        { code: 'AS', name: 'Alaska Airlines', logo: '🏔️' },
        { code: 'B6', name: 'JetBlue Airways', logo: '💙' },
        { code: 'NK', name: 'Spirit Airlines', logo: '💛' },
        { code: 'F9', name: 'Frontier Airlines', logo: '🦅' },
        { code: 'G4', name: 'Allegiant Air', logo: '☀️' },
        { code: 'HA', name: 'Hawaiian Airlines', logo: '🌺' },
        { code: 'AC', name: 'Air Canada', logo: '🍁' },
        { code: 'BA', name: 'British Airways', logo: '🇬🇧' },
        { code: 'LH', name: 'Lufthansa', logo: '🇩🇪' },
        { code: 'AF', name: 'Air France', logo: '🇫🇷' },
        { code: 'KL', name: 'KLM', logo: '🇳🇱' },
        { code: 'EK', name: 'Emirates', logo: '🇦🇪' },
        { code: 'QR', name: 'Qatar Airways', logo: '🇶🇦' },
        { code: 'SQ', name: 'Singapore Airlines', logo: '🇸🇬' },
        { code: 'CX', name: 'Cathay Pacific', logo: '🇭🇰' },
        { code: 'JL', name: 'Japan Airlines', logo: '🇯🇵' },
        { code: 'NH', name: 'All Nippon Airways', logo: '🗾' },
        { code: 'QF', name: 'Qantas', logo: '🇦🇺' },
        { code: 'NZ', name: 'Air New Zealand', logo: '🇳🇿' },
        { code: 'LX', name: 'Swiss International', logo: '🇨🇭' },
        { code: 'IB', name: 'Iberia', logo: '🇪🇸' },
        { code: 'AZ', name: 'ITA Airways', logo: '🇮🇹' },
        { code: 'TK', name: 'Turkish Airlines', logo: '🇹🇷' },
        { code: 'EY', name: 'Etihad Airways', logo: '🌟' },
        { code: 'SV', name: 'Saudia', logo: '🇸🇦' },
        { code: 'AM', name: 'Aeroméxico', logo: '🇲🇽' }
    ];
    
    res.json({ airlines });
});

// Events Discovery API endpoint
app.get('/api/events', async (req, res) => {
    const { city, startDate, endDate } = req.query;
    
    if (!city) {
        return res.status(400).json({ error: 'City is required' });
    }
    
    try {
        // First try to fetch real events from APIs
        const result = await eventsAPI.fetchAllEvents(city, startDate, endDate);
        
        // If we have real events, return them
        if (result.events && result.events.length > 0) {
            return res.json({
                events: result.events,
                sources: result.sources,
                cached: result.cached,
                totalCount: result.events.length
            });
        }
        
        // If no API keys are configured or no events found, use fallback
        const fallbackEvents = await eventsAPI.fetchFreeEvents(city, startDate, endDate);
        
        if (fallbackEvents.length > 0) {
            return res.json({
                events: fallbackEvents,
                sources: ['Local Events'],
                cached: false,
                totalCount: fallbackEvents.length
            });
        }
        
        // Last resort: generate mock events
        const mockEvents = generateEventsForCity(city, startDate, endDate);
        return res.json({ 
            events: mockEvents,
            sources: ['Generated'],
            cached: false,
            totalCount: mockEvents.length
        });
    } catch (error) {
        console.error('Events API error:', error);
        // Fallback to generated events on error
        const events = generateEventsForCity(city, startDate, endDate);
        res.json({ 
            events,
            sources: ['Generated'],
            error: 'Failed to fetch live events',
            totalCount: events.length
        });
    }
});

function generateEventsForCity(city, startDate, endDate) {
    const start = new Date(startDate || Date.now());
    const end = new Date(endDate || Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // Event templates based on category
    const eventTemplates = {
        concerts: [
            { name: 'Local Jazz Night', venue: 'Blue Note Jazz Club', price: '$25-45', category: 'Music' },
            { name: 'Symphony Orchestra', venue: 'City Concert Hall', price: '$35-120', category: 'Music' },
            { name: 'Indie Rock Festival', venue: 'Outdoor Amphitheater', price: '$45-80', category: 'Music' },
            { name: 'Electronic Music Night', venue: 'The Warehouse', price: '$20-35', category: 'Music' }
        ],
        sports: [
            { name: 'Basketball Game', venue: 'Sports Arena', price: '$40-250', category: 'Sports' },
            { name: 'Hockey Match', venue: 'Ice Center', price: '$35-180', category: 'Sports' },
            { name: 'Soccer Championship', venue: 'City Stadium', price: '$25-120', category: 'Sports' },
            { name: 'Baseball Game', venue: 'Baseball Park', price: '$15-85', category: 'Sports' }
        ],
        theater: [
            { name: 'Broadway Musical', venue: 'Grand Theater', price: '$65-185', category: 'Theater' },
            { name: 'Shakespeare Play', venue: 'Classic Theater', price: '$35-75', category: 'Theater' },
            { name: 'Comedy Show', venue: 'Laugh Factory', price: '$25-45', category: 'Comedy' },
            { name: 'Ballet Performance', venue: 'Opera House', price: '$45-150', category: 'Theater' }
        ],
        festivals: [
            { name: 'Food & Wine Festival', venue: 'City Park', price: '$15-40', category: 'Festival' },
            { name: 'Art & Craft Fair', venue: 'Convention Center', price: 'Free-$10', category: 'Festival' },
            { name: 'Christmas Market', venue: 'Downtown Square', price: 'Free', category: 'Festival' },
            { name: 'Cultural Festival', venue: 'Heritage Park', price: 'Free-$15', category: 'Festival' }
        ],
        special: [
            { name: 'Museum After Dark', venue: 'City Museum', price: '$20-30', category: 'Special' },
            { name: 'Rooftop Cinema', venue: 'Skyline Hotel', price: '$15-25', category: 'Entertainment' },
            { name: 'Escape Room Challenge', venue: 'Mystery Manor', price: '$30-40', category: 'Entertainment' },
            { name: 'Wine Tasting Evening', venue: 'Vintage Cellars', price: '$35-55', category: 'Food & Drink' }
        ],
        outdoor: [
            { name: 'Guided City Tour', venue: 'Historic District', price: '$20-35', category: 'Tours' },
            { name: 'Sunset Kayaking', venue: 'City Lake', price: '$45-60', category: 'Outdoor' },
            { name: 'Mountain Hike', venue: 'National Park', price: '$10-20', category: 'Outdoor' },
            { name: 'Bike Tour', venue: 'Scenic Route', price: '$25-40', category: 'Outdoor' }
        ],
        family: [
            { name: 'Zoo Adventure Day', venue: 'City Zoo', price: '$15-25', category: 'Family' },
            { name: 'Science Museum', venue: 'Discovery Center', price: '$12-20', category: 'Family' },
            { name: 'Aquarium Visit', venue: 'Marine World', price: '$18-30', category: 'Family' },
            { name: 'Theme Park Day', venue: 'Adventure Land', price: '$45-85', category: 'Family' }
        ],
        nightlife: [
            { name: 'Pub Crawl Tour', venue: 'Downtown District', price: '$25-40', category: 'Nightlife' },
            { name: 'Rooftop Bar Experience', venue: 'Sky Lounge', price: '$0-20', category: 'Nightlife' },
            { name: 'Dance Club Night', venue: 'Club Nova', price: '$15-30', category: 'Nightlife' },
            { name: 'Karaoke Night', venue: 'Sing Along Bar', price: '$5-15', category: 'Nightlife' }
        ]
    };
    
    const events = [];
    const categories = Object.keys(eventTemplates);
    const daysCount = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    
    // Generate 3-8 events per day
    for (let i = 0; i < daysCount; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(currentDate.getDate() + i);
        
        const eventsPerDay = 3 + Math.floor(Math.random() * 6);
        
        for (let j = 0; j < eventsPerDay; j++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const templates = eventTemplates[category];
            const template = templates[Math.floor(Math.random() * templates.length)];
            
            // Generate event time
            const hour = 10 + Math.floor(Math.random() * 12);
            const minutes = Math.random() > 0.5 ? '00' : '30';
            const eventTime = `${hour}:${minutes}`;
            
            // Add city-specific venue names
            const localVenue = template.venue.replace('City', city);
            
            events.push({
                id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: template.name,
                venue: localVenue,
                date: currentDate.toISOString().split('T')[0],
                time: eventTime,
                price: template.price,
                category: template.category,
                description: `Experience ${template.name} at ${localVenue}`,
                image: null, // Could add image URLs here
                isPopular: Math.random() > 0.7,
                isFree: template.price === 'Free',
                bookingUrl: '#'
            });
        }
    }
    
    // Sort by date and time
    events.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateA - dateB;
    });
    
    return events;
}

// Places Autocomplete API endpoint
app.get('/api/places/autocomplete', async (req, res) => {
    const { query, sessionToken, types, limit = 8 } = req.query;
    
    if (!query || query.length < 2) {
        return res.json({ predictions: [] });
    }
    
    // Create cache key
    const cacheKey = `${query.toLowerCase()}_${types || 'all'}`;
    
    // Check cache
    const cached = placesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json({ predictions: cached.data, cached: true });
    }
    
    try {
        // Using Nominatim (OpenStreetMap) for free geocoding
        const searchTypes = types ? types.split(',') : ['city', 'town', 'village', 'state', 'country'];
        const nominatimQuery = new URLSearchParams({
            q: query,
            format: 'json',
            addressdetails: '1',
            limit: limit,
            'accept-language': 'en',
            dedupe: '1'
        });
        
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${nominatimQuery}`,
            {
                headers: {
                    'User-Agent': 'Pathfind Trip Planner'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Geocoding service error');
        }
        
        const data = await response.json();
        
        // Process and normalize the results
        const predictions = data.map(place => {
            const components = [];
            const address = place.address || {};
            
            // Build display name based on place type
            let mainName = '';
            let placeType = 'place';
            
            if (address.city || address.town || address.village) {
                mainName = address.city || address.town || address.village;
                placeType = 'city';
                components.push(mainName);
            } else if (address.state) {
                mainName = address.state;
                placeType = 'state';
                components.push(mainName);
            } else if (address.country) {
                mainName = address.country;
                placeType = 'country';
                components.push(mainName);
            } else {
                mainName = place.display_name.split(',')[0];
                components.push(mainName);
            }
            
            // Add state/region if available and not already included
            if (address.state && !components.includes(address.state)) {
                components.push(address.state);
            }
            
            // Add country if available and not already included
            if (address.country && !components.includes(address.country)) {
                components.push(address.country);
            }
            
            return {
                place_id: place.place_id,
                osm_id: place.osm_id,
                main_text: mainName,
                secondary_text: components.slice(1).join(', '),
                description: components.join(', '),
                type: placeType,
                lat: parseFloat(place.lat),
                lon: parseFloat(place.lon),
                structured_formatting: {
                    main_text: mainName,
                    secondary_text: components.slice(1).join(', ')
                }
            };
        })
        .filter((place, index, self) => {
            // Remove duplicates based on main_text and secondary_text
            return index === self.findIndex(p => 
                p.main_text === place.main_text && 
                p.secondary_text === place.secondary_text
            );
        })
        .slice(0, parseInt(limit));
        
        // Cache the results
        placesCache.set(cacheKey, {
            data: predictions,
            timestamp: Date.now()
        });
        
        // Clean old cache entries
        for (const [key, value] of placesCache.entries()) {
            if (Date.now() - value.timestamp > CACHE_TTL) {
                placesCache.delete(key);
            }
        }
        
        res.json({ predictions, sessionToken });
    } catch (error) {
        console.error('Places autocomplete error:', error);
        
        // Return cached results if available, even if expired
        const cached = placesCache.get(cacheKey);
        if (cached) {
            return res.json({ predictions: cached.data, cached: true, stale: true });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch place suggestions',
            predictions: [] 
        });
    }
});

// Place Details API endpoint
app.get('/api/places/details', async (req, res) => {
    const { place_id, osm_id } = req.query;
    
    if (!place_id && !osm_id) {
        return res.status(400).json({ error: 'place_id or osm_id required' });
    }
    
    try {
        const query = new URLSearchParams({
            format: 'json',
            addressdetails: '1',
            extratags: '1',
            namedetails: '1',
            'accept-language': 'en'
        });
        
        if (osm_id) {
            query.append('osm_type', 'N');
            query.append('osm_id', osm_id);
        }
        
        const response = await fetch(
            `https://nominatim.openstreetmap.org/lookup?${query}`,
            {
                headers: {
                    'User-Agent': 'Pathfind Trip Planner'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Place details service error');
        }
        
        const data = await response.json();
        const place = data[0];
        
        if (!place) {
            return res.status(404).json({ error: 'Place not found' });
        }
        
        res.json({
            place_id: place.place_id,
            name: place.display_name.split(',')[0],
            formatted_address: place.display_name,
            lat: parseFloat(place.lat),
            lon: parseFloat(place.lon),
            address_components: place.address,
            types: [place.type, place.class].filter(Boolean)
        });
    } catch (error) {
        console.error('Place details error:', error);
        res.status(500).json({ error: 'Failed to fetch place details' });
    }
});

// Socket.io for real-time features
io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('join-trip', (data) => {
        const { tripId, userId, userName } = data;
        socket.join(tripId);
        
        if (!activeUsers.has(tripId)) {
            activeUsers.set(tripId, new Set());
        }
        activeUsers.get(tripId).add({ userId, userName, socketId: socket.id });
        
        socket.to(tripId).emit('user-joined', { userId, userName });
        
        const trip = trips.get(tripId);
        if (trip) {
            socket.emit('trip-data', trip);
        }
    });
    
    socket.on('update-itinerary', (data) => {
        const { tripId, itinerary } = data;
        const trip = trips.get(tripId);
        
        if (trip) {
            trip.itinerary = itinerary;
            io.to(tripId).emit('itinerary-updated', itinerary);
        }
    });
    
    socket.on('update-budget', (data) => {
        const { tripId, budget } = data;
        const trip = trips.get(tripId);
        
        if (trip) {
            trip.budget = budget;
            io.to(tripId).emit('budget-updated', budget);
        }
    });
    
    socket.on('add-place', (data) => {
        const { tripId, place } = data;
        const trip = trips.get(tripId);
        
        if (trip) {
            trip.places.push(place);
            io.to(tripId).emit('place-added', place);
        }
    });
    
    socket.on('chat-message', (data) => {
        const { tripId, message, userName } = data;
        io.to(tripId).emit('new-message', { 
            message, 
            userName, 
            timestamp: new Date() 
        });
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        
        activeUsers.forEach((users, tripId) => {
            const user = Array.from(users).find(u => u.socketId === socket.id);
            if (user) {
                users.delete(user);
                socket.to(tripId).emit('user-left', { 
                    userId: user.userId, 
                    userName: user.userName 
                });
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Pathfind server running on port ${PORT}`);
});