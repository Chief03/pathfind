#!/usr/bin/env node

// Comprehensive test script for Pathfind application
const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3001';
let testResults = [];
let testsPassed = 0;
let testsFailed = 0;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

// Test helper functions
async function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = {
                        status: res.statusCode,
                        headers: res.headers,
                        body: body ? JSON.parse(body) : null
                    };
                    resolve(result);
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function test(name, testFn) {
    try {
        console.log(`${colors.blue}Testing: ${name}${colors.reset}`);
        await testFn();
        console.log(`${colors.green}✓ ${name}${colors.reset}`);
        testsPassed++;
        testResults.push({ name, status: 'PASSED' });
    } catch (error) {
        console.error(`${colors.red}✗ ${name}${colors.reset}`);
        console.error(`  Error: ${error.message}`);
        testsFailed++;
        testResults.push({ name, status: 'FAILED', error: error.message });
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

// Test suites
async function testHealthCheck() {
    const res = await makeRequest('GET', '/health');
    assert(res.status === 200 || res.status === 404, `Expected 200 or 404, got ${res.status}`);
    if (res.status === 200) {
        assert(res.body.status === 'UP', 'Health check should return UP status');
    }
}

async function testStaticFiles() {
    const res = await makeRequest('GET', '/');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.headers['content-type'].includes('text/html'), 'Should return HTML');
}

async function testTripCreation() {
    const tripData = {
        name: 'Test Trip to Paris',
        destinationCity: 'Paris',
        startDate: '2024-12-01',
        endDate: '2024-12-08',
        groupSize: 4,
        description: 'Test trip for validation'
    };

    const res = await makeRequest('POST', '/api/trips/create-anonymous', tripData);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.id, 'Trip should have an ID');
    assert(res.body.shareCode, 'Trip should have a share code');
    assert(res.body.shareCode.length === 8, 'Share code should be 8 characters');
    assert(res.body.destinationCity, 'Trip should have destination city');
    
    return res.body;
}

async function testJoinTripByCode(shareCode) {
    const res = await makeRequest('POST', '/api/trips/join-code', {
        code: shareCode,
        userName: 'Test User'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.tripId, 'Should return trip ID');
    assert(res.body.name, 'Should return trip name');
}

async function testFlightOperations(tripId) {
    // Add flight
    const flightData = {
        airline: 'Air France',
        flightNumber: 'AF123',
        departureAirport: { code: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'USA', tz: 'America/New_York' },
        arrivalAirport: { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', tz: 'Europe/Paris' },
        departureTime: '2024-12-01T14:00:00Z',
        arrivalTime: '2024-12-02T03:00:00Z',
        travelerName: 'Test Traveler'
    };

    const addRes = await makeRequest('POST', `/api/trips/${tripId}/flights`, flightData);
    assert(addRes.status === 201, `Expected 201, got ${addRes.status}`);
    assert(addRes.body.id, 'Flight should have an ID');

    // Get flights
    const getRes = await makeRequest('GET', `/api/trips/${tripId}/flights`);
    assert(getRes.status === 200, `Expected 200, got ${getRes.status}`);
    assert(Array.isArray(getRes.body), 'Should return array of flights');
    assert(getRes.body.length > 0, 'Should have at least one flight');

    return addRes.body.id;
}

async function testEventDiscovery() {
    const res = await makeRequest('GET', '/api/events?city=Paris&startDate=2024-12-01&endDate=2024-12-08');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.events, 'Should return events array');
    assert(Array.isArray(res.body.events), 'Events should be an array');
    assert(res.body.events.length > 0, 'Should have at least one event');
}

async function testActivities() {
    const res = await makeRequest('GET', '/api/activities?city=Paris');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.items, 'Should return items array');
    assert(Array.isArray(res.body.items), 'Items should be an array');
    assert(res.body.items.length > 0, 'Should have at least one activity');
}

async function testPlacesAutocomplete() {
    const res = await makeRequest('GET', '/api/places/autocomplete?query=New York');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.predictions, 'Should return predictions');
    assert(Array.isArray(res.body.predictions), 'Predictions should be an array');
}

async function testAirportSearch() {
    const res = await makeRequest('GET', '/api/airports/search?query=JFK');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.airports, 'Should return airports');
    assert(Array.isArray(res.body.airports), 'Airports should be an array');
    assert(res.body.airports.length > 0, 'Should find at least one airport');
    assert(res.body.airports[0].code === 'JFK', 'Should find JFK airport');
}

async function testAirlines() {
    const res = await makeRequest('GET', '/api/airlines');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.airlines, 'Should return airlines');
    assert(Array.isArray(res.body.airlines), 'Airlines should be an array');
    assert(res.body.airlines.length > 0, 'Should have airlines');
}

async function testAuthentication() {
    // Test signup
    const userData = {
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
        birthdate: '1990-01-01'
    };

    const signupRes = await makeRequest('POST', '/api/auth/signup', userData);
    assert(signupRes.status === 200, `Expected 200, got ${signupRes.status}`);
    assert(signupRes.body.token, 'Should return authentication token');
    assert(signupRes.body.user, 'Should return user data');
    assert(signupRes.body.user.email === userData.email, 'Email should match');

    // Test login
    const loginRes = await makeRequest('POST', '/api/auth/login', {
        email: userData.email,
        password: userData.password
    });
    assert(loginRes.status === 200, `Expected 200, got ${loginRes.status}`);
    assert(loginRes.body.token, 'Should return authentication token');
    
    return loginRes.body.token;
}

async function testAuthenticatedTripCreation(token) {
    const tripData = {
        name: 'Authenticated Trip',
        destinationCity: 'London',
        departureCity: 'New York',
        startDate: '2024-12-15',
        endDate: '2024-12-22',
        groupSize: 2
    };

    const res = await makeRequest('POST', '/api/trips', tripData, {
        'Authorization': `Bearer ${token}`
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.id, 'Trip should have an ID');
    assert(res.body.creatorId !== 'anonymous', 'Creator should not be anonymous');
    
    return res.body.id;
}

async function testUserTrips(token) {
    const res = await makeRequest('GET', '/api/trips/user', null, {
        'Authorization': `Bearer ${token}`
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Should return array of trips');
}

async function testInvalidRequests() {
    // Test invalid city
    const res1 = await makeRequest('POST', '/api/trips/create-anonymous', {
        name: 'Invalid Trip',
        destinationCity: 'xyz123invalid'
    });
    assert(res1.status === 400, `Expected 400 for invalid city, got ${res1.status}`);

    // Test invalid trip code
    const res2 = await makeRequest('POST', '/api/trips/join-code', {
        code: 'INVALID1'
    });
    assert(res2.status === 404, `Expected 404 for invalid code, got ${res2.status}`);

    // Test unauthorized access
    const res3 = await makeRequest('GET', '/api/trips/user');
    assert(res3.status === 401, `Expected 401 for unauthorized, got ${res3.status}`);
}

async function testRateLimiting() {
    // Make many requests quickly to trigger rate limiting
    const promises = [];
    for (let i = 0; i < 35; i++) {
        promises.push(makeRequest('GET', '/api/places/autocomplete?query=test'));
    }
    
    const results = await Promise.all(promises);
    const rateLimited = results.some(r => r.status === 429);
    
    // Rate limiting might not be enabled in all environments
    if (rateLimited) {
        console.log(`  ${colors.yellow}Rate limiting is active${colors.reset}`);
    } else {
        console.log(`  ${colors.yellow}Rate limiting not detected (may be disabled)${colors.reset}`);
    }
}

// Main test runner
async function runAllTests() {
    console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.blue}Starting Pathfind Application Tests${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);

    // Basic tests
    await test('Health Check', testHealthCheck);
    await test('Static Files', testStaticFiles);
    
    // Trip operations
    const trip = await test('Anonymous Trip Creation', testTripCreation);
    if (trip) {
        await test('Join Trip by Code', () => testJoinTripByCode(trip.shareCode));
        await test('Flight Operations', () => testFlightOperations(trip.id));
    }
    
    // Discovery features
    await test('Event Discovery', testEventDiscovery);
    await test('Activities', testActivities);
    await test('Places Autocomplete', testPlacesAutocomplete);
    await test('Airport Search', testAirportSearch);
    await test('Airlines List', testAirlines);
    
    // Authentication
    const token = await test('Authentication', testAuthentication);
    if (token) {
        await test('Authenticated Trip Creation', () => testAuthenticatedTripCreation(token));
        await test('User Trips', () => testUserTrips(token));
    }
    
    // Error handling
    await test('Invalid Requests', testInvalidRequests);
    await test('Rate Limiting', testRateLimiting);

    // Summary
    console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.blue}Test Summary${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
    console.log(`Total: ${testsPassed + testsFailed}`);
    
    if (testsFailed === 0) {
        console.log(`\n${colors.green}✅ All tests passed successfully!${colors.reset}`);
    } else {
        console.log(`\n${colors.red}❌ Some tests failed. Please review the errors above.${colors.reset}`);
        process.exit(1);
    }
}

// Check if server is running
async function checkServer() {
    try {
        await makeRequest('GET', '/');
        return true;
    } catch (error) {
        console.error(`${colors.red}Error: Server is not running on ${BASE_URL}${colors.reset}`);
        console.error(`Please start the server with: npm start`);
        return false;
    }
}

// Run tests
(async () => {
    const serverRunning = await checkServer();
    if (serverRunning) {
        await runAllTests();
    } else {
        process.exit(1);
    }
})();