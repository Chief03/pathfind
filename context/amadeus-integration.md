# Amadeus Flight API Integration Guide

## Overview
Complete integration of Amadeus Global Distribution System (GDS) for real-time flight data in PathFind application.

## Architecture

```
User Input (Flight Number)
    ↓
Next.js Frontend (FlightManagement.tsx)
    ↓
Next.js API Route (/api/flight-lookup)
    ↓
Amadeus OAuth2 Authentication
    ↓
Multiple Amadeus Endpoints:
    - Flight Offers Search
    - Airline Reference Data
    - Airport Reference Data
    ↓
Data Enrichment & Formatting
    ↓
Return to Frontend
    ↓
Auto-populate Form Fields
```

## Implementation Details

### 1. Authentication Flow
```typescript
// OAuth2 token acquisition
POST https://test.api.amadeus.com/v1/security/oauth2/token
Body: {
  grant_type: 'client_credentials',
  client_id: AMADEUS_CLIENT_ID,
  client_secret: AMADEUS_CLIENT_SECRET
}
Response: { access_token, expires_in }
```

### 2. Flight Search Strategy
Since Amadeus doesn't offer direct flight number search, we implemented a multi-route search:

```typescript
const commonRoutes = [
  { origin: 'JFK', destination: 'LAX' },
  { origin: 'LAX', destination: 'JFK' },
  { origin: 'ORD', destination: 'LAX' },
  // ... 14 major US routes
]
```

### 3. Data Enrichment Process
1. **Parse flight number** → Extract carrier code and flight number
2. **Get airline details** → Full airline name from reference API
3. **Search for flights** → Try multiple routes until carrier found
4. **Match flight number** → Exact match or fallback to sample
5. **Get airport details** → Full airport names and cities
6. **Format response** → Structure data for frontend consumption

## API Endpoints Used

### Flight Offers Search
- **Endpoint**: `/v2/shopping/flight-offers`
- **Purpose**: Find available flights with comprehensive data
- **Returns**: Flights with times, airports, aircraft, duration

### Airline Reference Data
- **Endpoint**: `/v1/reference-data/airlines`
- **Purpose**: Get full airline names from IATA codes
- **Returns**: Business name, common name

### Airport Reference Data
- **Endpoint**: `/v1/reference-data/locations`
- **Purpose**: Get full airport details from IATA codes
- **Returns**: Airport name, city, country

## Field Mapping

### Available from API → Frontend
| Frontend Field | API Source | Availability |
|---------------|------------|--------------|
| airline | carrierCode → airline.businessName | ✅ Always |
| flightNumber | carrierCode + number | ✅ Always |
| departureTime | segment.departure.at | ✅ Always |
| arrivalTime | segment.arrival.at | ✅ Always |
| departureAirport | departure.iataCode → location API | ✅ Always |
| arrivalAirport | arrival.iataCode → location API | ✅ Always |
| terminal | departure.terminal | ⚠️ Sometimes |
| aircraft | aircraft.code | ⚠️ Sometimes |
| duration | segment.duration | ✅ Always |

### User Must Provide
- **gate**: Not available until close to departure
- **confirmationCode**: User's personal booking reference
- **notes**: User-generated content
- **direction**: Inferred from context

## Testing Scripts

### Python Test Suite
Located in `/integrations-lab/python/`:

1. **airline_api_test.py** - Comprehensive API testing
2. **test_amadeus.py** - Basic connectivity test
3. **lookup_flight.py** - Command-line flight lookup
4. **analyze_flight_fields.py** - Field analysis tool

### Usage Examples
```bash
# Test specific flight
python3 lookup_flight.py "AA123"
python3 lookup_flight.py "UA 456"

# Analyze available fields
python3 analyze_flight_fields.py
```

## Environment Configuration

### Required Variables
```env
AMADEUS_CLIENT_ID=your_client_id_here
AMADEUS_CLIENT_SECRET=your_client_secret_here
```

### Getting Credentials
1. Go to https://developers.amadeus.com/
2. Register for free account
3. Create new app in dashboard
4. Copy API Key (Client ID) and API Secret

## Cost Analysis

### Test Environment (Current)
- **Cost**: Free
- **Limit**: 500 API calls/month
- **Data**: Limited test data
- **Airlines**: AS, UA (limited AA, no DL, no WN)

### Production Environment
- **Cost**: ~$0.003 per API call
- **Data**: Real-time, all GDS airlines
- **Coverage**: 
  - ✅ All major carriers (AA, DL, UA, AS, B6)
  - ✅ International airlines
  - ❌ Southwest (doesn't use GDS)
  - ❌ Some budget carriers

### Cost Optimization Strategy
```javascript
// Implement caching to reduce API calls
const cacheStrategy = {
  popularRoutes: '24 hours',
  airlineData: '7 days',
  airportData: '30 days',
  flightSchedules: '24 hours'
}

// Expected costs with caching:
// 100 users = ~$1/month
// 1000 users = ~$10/month
```

## Error Handling

### Common Errors & Solutions

1. **Flight Not Found**
   - Fallback to sample data from same airline
   - Show informative message to user

2. **Authentication Failed**
   - Check credentials in .env
   - Verify token expiration (30 minutes)

3. **Rate Limit Exceeded**
   - Implement caching
   - Upgrade to production tier

4. **Carrier Not in Database**
   - Southwest, Spirit, Frontier limited
   - Suggest alternative carriers

## Future Enhancements

### Phase 1: Optimization
- [ ] Implement Redis caching layer
- [ ] Add request debouncing
- [ ] Batch airport/airline lookups

### Phase 2: Features
- [ ] Real-time flight status updates
- [ ] Flight delay predictions
- [ ] Gate change notifications
- [ ] Price tracking

### Phase 3: Scale
- [ ] Move to production Amadeus
- [ ] Add multiple GDS providers
- [ ] Implement GraphQL layer
- [ ] Add webhook support

## Troubleshooting

### API Returns 404
```bash
# Check if carrier is supported
curl -X POST http://localhost:3001/api/flight-lookup \
  -H "Content-Type: application/json" \
  -d '{"flightNumber": "AS31"}'
```

### No Exact Flight Match
- API will use sample data from same airline
- Message indicates when using sample data
- Still provides accurate airline/route info

### Performance Issues
- Searches up to 14 routes (can be slow)
- Consider reducing routes searched
- Implement caching ASAP

## Best Practices

1. **Always cache airline/airport data** - Changes rarely
2. **Use sample data gracefully** - Better than no data
3. **Handle Southwest specially** - They don't use GDS
4. **Pre-fetch popular routes** - Reduce user wait time
5. **Monitor API usage** - Stay within limits
6. **Log all API calls** - For debugging and optimization