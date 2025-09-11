#!/usr/bin/env python3
"""
Analyze all fields available from Amadeus API and compare with frontend needs
"""

import os
import sys
import requests
import json
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path to read .env from repo root
repo_root = Path(__file__).parent.parent.parent
env_path = repo_root / '.env'

def load_env_file(filepath):
    """Load environment variables from .env file"""
    credentials = {}
    if filepath.exists():
        with open(filepath, 'r') as f:
            content = f.read().strip()
            parts = content.split()
            if len(parts) >= 2:
                credentials['AMADEUS_CLIENT_ID'] = parts[0]
                credentials['AMADEUS_CLIENT_SECRET'] = parts[1]
    return credentials

def get_amadeus_token(client_id: str, client_secret: str):
    """Get OAuth token for Amadeus API"""
    url = "https://test.api.amadeus.com/v1/security/oauth2/token"
    
    data = {
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_secret': client_secret
    }
    
    response = requests.post(url, data=data)
    if response.status_code == 200:
        return response.json()['access_token']
    return None

def get_comprehensive_flight_data(token: str):
    """Get all available flight data from various Amadeus endpoints"""
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    all_data = {}
    
    print("=" * 80)
    print("AMADEUS API FIELD ANALYSIS")
    print("=" * 80)
    
    # 1. Flight Offers Search - Most comprehensive data
    print("\n1. FLIGHT OFFERS SEARCH (Shopping API)")
    print("-" * 40)
    url = "https://test.api.amadeus.com/v2/shopping/flight-offers"
    params = {
        'originLocationCode': 'JFK',
        'destinationLocationCode': 'LAX',
        'departureDate': tomorrow,
        'adults': '1',
        'max': '1'
    }
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        if data.get('data') and len(data['data']) > 0:
            offer = data['data'][0]
            all_data['flight_offers'] = offer
            
            print("Available fields from Flight Offers:")
            if offer.get('itineraries'):
                for segment in offer['itineraries'][0].get('segments', []):
                    print(f"\n  SEGMENT DATA:")
                    for key, value in segment.items():
                        print(f"    • {key}: {value}")
                    
                    if segment.get('departure'):
                        print(f"\n  DEPARTURE DATA:")
                        for key, value in segment['departure'].items():
                            print(f"    • departure.{key}: {value}")
                    
                    if segment.get('arrival'):
                        print(f"\n  ARRIVAL DATA:")
                        for key, value in segment['arrival'].items():
                            print(f"    • arrival.{key}: {value}")
    
    # 2. Flight Status/Schedule
    print("\n2. FLIGHT SCHEDULE API")
    print("-" * 40)
    url = "https://test.api.amadeus.com/v2/schedule/flights"
    params = {
        'carrierCode': 'AA',
        'flightNumber': '1',
        'scheduledDepartureDate': tomorrow
    }
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        if data.get('data'):
            all_data['schedule'] = data['data']
            print("Available fields from Schedule API:")
            if data['data']:
                flight = data['data'][0]
                for key, value in flight.items():
                    print(f"  • {key}: {type(value).__name__}")
                    if key == 'flightSegments' and value:
                        print("\n  FLIGHT SEGMENT fields:")
                        for seg_key in value[0].keys():
                            print(f"    • {seg_key}")
    
    # 3. Airport/Location Data
    print("\n3. AIRPORT REFERENCE DATA")
    print("-" * 40)
    url = "https://test.api.amadeus.com/v1/reference-data/locations"
    params = {
        'subType': 'AIRPORT',
        'keyword': 'JFK'
    }
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        if data.get('data'):
            all_data['airport'] = data['data'][0]
            print("Available fields from Airport API:")
            airport = data['data'][0]
            for key, value in airport.items():
                print(f"  • {key}: {value if not isinstance(value, dict) else type(value).__name__}")
                if key == 'address' and isinstance(value, dict):
                    for addr_key, addr_val in value.items():
                        print(f"    • address.{addr_key}: {addr_val}")
    
    # 4. Airline Reference Data
    print("\n4. AIRLINE REFERENCE DATA")
    print("-" * 40)
    url = "https://test.api.amadeus.com/v1/reference-data/airlines"
    params = {'airlineCodes': 'AA'}
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        if data.get('data'):
            all_data['airline'] = data['data'][0]
            print("Available fields from Airline API:")
            for key, value in data['data'][0].items():
                print(f"  • {key}: {value}")
    
    return all_data

def compare_with_frontend():
    """Compare available API fields with frontend requirements"""
    
    print("\n" + "=" * 80)
    print("FRONTEND vs API FIELD MAPPING")
    print("=" * 80)
    
    # Frontend fields from FlightManagement.tsx
    frontend_fields = {
        'airline': 'Airline name (e.g., American Airlines)',
        'flightNumber': 'Flight number (e.g., AA123)',
        'departureTime': 'Departure date/time',
        'arrivalTime': 'Arrival date/time',
        'departureAirport': 'Departure airport code (JSON with code, name, city)',
        'arrivalAirport': 'Arrival airport code (JSON with code, name, city)',
        'terminal': 'Terminal number',
        'gate': 'Gate number',
        'confirmationCode': 'Booking confirmation',
        'notes': 'Additional notes',
        'direction': 'arrival or departure',
        'addedByUserName': 'User who added the flight'
    }
    
    # API field mappings
    api_mappings = {
        'airline': [
            'API: segment.carrierCode → Reference API → airline.businessName',
            'Available: ✅ YES (via airline reference API)'
        ],
        'flightNumber': [
            'API: segment.carrierCode + segment.number',
            'Available: ✅ YES'
        ],
        'departureTime': [
            'API: segment.departure.at',
            'Available: ✅ YES (ISO format: 2025-09-11T16:00:00)'
        ],
        'arrivalTime': [
            'API: segment.arrival.at',
            'Available: ✅ YES (ISO format: 2025-09-11T19:25:00)'
        ],
        'departureAirport': [
            'API: segment.departure.iataCode → Location API for full details',
            'Available: ✅ YES (need to enrich with location API)'
        ],
        'arrivalAirport': [
            'API: segment.arrival.iataCode → Location API for full details',
            'Available: ✅ YES (need to enrich with location API)'
        ],
        'terminal': [
            'API: segment.departure.terminal OR segment.arrival.terminal',
            'Available: ⚠️ SOMETIMES (not always provided)'
        ],
        'gate': [
            'API: Not available in search/schedule APIs',
            'Available: ❌ NO (gates assigned closer to departure)'
        ],
        'confirmationCode': [
            'API: Not applicable (user-specific)',
            'Available: ❌ NO (user must provide)'
        ],
        'notes': [
            'API: Not applicable',
            'Available: ❌ NO (user-generated)'
        ],
        'direction': [
            'API: Not provided (we determine based on context)',
            'Available: ⚠️ DERIVED (we set based on user action)'
        ],
        'addedByUserName': [
            'API: Not applicable',
            'Available: ❌ NO (from authenticated user)'
        ]
    }
    
    print("\nFRONTEND FIELDS ANALYSIS:")
    print("-" * 40)
    for field, description in frontend_fields.items():
        print(f"\n📋 {field}")
        print(f"   Description: {description}")
        if field in api_mappings:
            for info in api_mappings[field]:
                print(f"   {info}")
    
    # Additional API fields not used by frontend
    print("\n" + "=" * 80)
    print("ADDITIONAL API FIELDS (Not currently used by frontend):")
    print("-" * 40)
    
    extra_fields = {
        'duration': 'Flight duration (e.g., PT3H25M)',
        'aircraft.code': 'Aircraft type (e.g., 738 for Boeing 737-800)',
        'blacklistedInEU': 'EU safety flag',
        'numberOfStops': 'Number of stops',
        'price.total': 'Total price',
        'price.currency': 'Price currency',
        'validatingAirlineCodes': 'Validating carrier',
        'bookingClass': 'Fare class',
        'cabin': 'Cabin type (ECONOMY, BUSINESS, etc.)',
        'fareBasis': 'Fare basis code',
        'brandedFare': 'Branded fare name'
    }
    
    for field, description in extra_fields.items():
        print(f"  • {field}: {description}")
    
    print("\n" + "=" * 80)
    print("RECOMMENDATIONS:")
    print("-" * 40)
    print("""
1. ✅ CORE FIELDS AVAILABLE:
   - Airline, flight number, departure/arrival times and airports
   - Can populate most required fields automatically

2. ⚠️ PARTIAL DATA:
   - Terminal: Sometimes available, not guaranteed
   - Direction: We need to infer this from user context

3. ❌ USER-PROVIDED ONLY:
   - Gate: Not available until close to departure
   - Confirmation code: Specific to user's booking
   - Notes: User-generated content

4. 💡 SUGGESTED ENHANCEMENTS:
   - Add aircraft type field (available from API)
   - Add flight duration field (available from API)
   - Add price field for reference (available from API)
   - Cache airline/airport data to reduce API calls
    """)

def main():
    print("Loading credentials...")
    creds = load_env_file(env_path)
    if not creds.get('AMADEUS_CLIENT_ID'):
        print("❌ Could not load credentials")
        return
    
    print("Authenticating...")
    token = get_amadeus_token(
        creds['AMADEUS_CLIENT_ID'],
        creds['AMADEUS_CLIENT_SECRET']
    )
    
    if not token:
        print("❌ Authentication failed")
        return
    
    # Get comprehensive field data
    all_data = get_comprehensive_flight_data(token)
    
    # Compare with frontend needs
    compare_with_frontend()
    
    # Save raw data for reference
    with open('amadeus_field_analysis.json', 'w') as f:
        json.dump(all_data, f, indent=2)
    print("\n✅ Raw API data saved to amadeus_field_analysis.json")

if __name__ == "__main__":
    main()