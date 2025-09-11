#!/usr/bin/env python3
"""
Airline API Integration Test Script
Testing various airline data providers to find flight information
"""

import os
import requests
import json
from datetime import datetime, timedelta
from typing import Dict, Optional

# ============================================
# OPTION 1: FlightAware AeroAPI
# ============================================
"""
FlightAware is one of the most comprehensive flight tracking APIs.
They provide real-time flight status, historical data, and flight predictions.

AUTHENTICATION REQUIRED:
1. Go to: https://flightaware.com/commercial/aeroapi/
2. Sign up for an account (they have a free tier)
3. Get your API key from the dashboard
4. Free tier includes: 500 queries/month

API Documentation: https://flightaware.com/aeroapi/portal/documentation
"""

def test_flightaware(api_key: str, flight_number: str):
    """Test FlightAware AeroAPI"""
    # Example: AA001 becomes AAL1
    airline_code = flight_number[:2]
    flight_num = flight_number[2:]
    
    headers = {
        'x-apikey': api_key,
    }
    
    # Get flight info endpoint
    url = f"https://aeroapi.flightaware.com/aeroapi/flights/{airline_code}{flight_num}"
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"FlightAware Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"FlightAware Exception: {e}")
        return None

# ============================================
# OPTION 2: AviationStack
# ============================================
"""
AviationStack provides real-time flight status and airline data.

AUTHENTICATION REQUIRED:
1. Go to: https://aviationstack.com/
2. Sign up for free account
3. Get your Access Key from dashboard
4. Free tier: 100 requests/month

API Documentation: https://aviationstack.com/documentation
"""

def test_aviationstack(access_key: str, flight_number: str):
    """Test AviationStack API"""
    params = {
        'access_key': access_key,
        'flight_iata': flight_number
    }
    
    url = 'http://api.aviationstack.com/v1/flights'
    
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"AviationStack Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"AviationStack Exception: {e}")
        return None

# ============================================
# OPTION 3: FlightAPI by Aviation Edge
# ============================================
"""
Aviation Edge provides airline routes, schedules, and real-time flight tracking.

AUTHENTICATION REQUIRED:
1. Go to: https://aviation-edge.com/
2. Sign up for account
3. Get API key from dashboard
4. Free tier: 100 requests/month

API Documentation: https://aviation-edge.com/developers/
"""

def test_aviation_edge(api_key: str, flight_number: str):
    """Test Aviation Edge API"""
    url = 'https://aviation-edge.com/v2/public/flights'
    
    params = {
        'key': api_key,
        'flightIata': flight_number
    }
    
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Aviation Edge Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Aviation Edge Exception: {e}")
        return None

# ============================================
# OPTION 4: Amadeus API
# ============================================
"""
Amadeus is a major GDS (Global Distribution System) provider.
They offer comprehensive flight search, booking, and status APIs.

AUTHENTICATION REQUIRED:
1. Go to: https://developers.amadeus.com/
2. Register for a free account
3. Create a new app in the dashboard
4. Get your API Key and API Secret
5. Free tier: 500 free API calls/month

API Documentation: https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/

Note: Amadeus uses OAuth2 authentication
"""

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
    else:
        print(f"Amadeus Auth Error: {response.status_code} - {response.text}")
        return None

def test_amadeus(client_id: str, client_secret: str, flight_number: str, date: str):
    """Test Amadeus API - Multiple endpoints for flight data"""
    token = get_amadeus_token(client_id, client_secret)
    if not token:
        return None
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    carrier_code = flight_number[:2]  # AA from AA001
    flight_num = flight_number[2:]    # 001 from AA001
    
    results = {}
    
    # Try multiple Amadeus endpoints to get comprehensive flight data
    
    # 1. Flight Status API (if flight is today/tomorrow)
    print(f"  Checking flight status for {carrier_code}{flight_num}...")
    url = "https://test.api.amadeus.com/v2/schedule/flights"
    params = {
        'carrierCode': carrier_code,
        'flightNumber': flight_num,
        'scheduledDepartureDate': date
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            results['schedule'] = response.json()
            print(f"  ✓ Found schedule data")
        else:
            print(f"  - Schedule API: {response.status_code}")
    except Exception as e:
        print(f"  - Schedule error: {e}")
    
    # 2. Flight Offers Search (for pricing and availability)
    print(f"  Searching flight offers...")
    url = "https://test.api.amadeus.com/v2/shopping/flight-offers"
    
    # For demo, search JFK to LAX (common route)
    params = {
        'originLocationCode': 'JFK',
        'destinationLocationCode': 'LAX',
        'departureDate': date,
        'adults': '1',
        'max': '1'
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            results['offers'] = response.json()
            print(f"  ✓ Found flight offers")
        else:
            print(f"  - Offers API: {response.status_code}")
    except Exception as e:
        print(f"  - Offers error: {e}")
    
    # 3. Airport & City Search (to get airport details)
    print(f"  Getting airport information...")
    url = "https://test.api.amadeus.com/v1/reference-data/locations"
    params = {
        'subType': 'AIRPORT',
        'keyword': 'JFK',
        'page[limit]': '1'
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            results['airports'] = response.json()
            print(f"  ✓ Found airport data")
        else:
            print(f"  - Airport API: {response.status_code}")
    except Exception as e:
        print(f"  - Airport error: {e}")
    
    return results if results else None

# ============================================
# OPTION 5: RapidAPI Flight Data APIs
# ============================================
"""
RapidAPI hosts multiple flight data APIs. Some popular ones:
- Flight Radar API
- Skyscanner Flight Search
- FlightLabs

AUTHENTICATION REQUIRED:
1. Go to: https://rapidapi.com/
2. Sign up for account
3. Subscribe to a flight API (many have free tiers)
4. Get your RapidAPI key from dashboard

Example: FlightLabs on RapidAPI
https://rapidapi.com/flightlabs/api/flightlabs-com
"""

def test_rapidapi_flightlabs(api_key: str, flight_number: str):
    """Test FlightLabs via RapidAPI"""
    url = "https://app.goflightlabs.com/flights"
    
    headers = {
        'X-RapidAPI-Key': api_key,
        'X-RapidAPI-Host': 'flightlabs.p.rapidapi.com'
    }
    
    params = {
        'flight_iata': flight_number
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"RapidAPI Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"RapidAPI Exception: {e}")
        return None

# ============================================
# MAIN TEST FUNCTION
# ============================================

def main():
    """
    Main function to test airline APIs
    
    TO USE THIS SCRIPT:
    1. Choose one of the APIs above
    2. Follow the authentication steps to get your API credentials
    3. Set the credentials as environment variables or update this script
    4. Run: python airline_api_test.py
    """
    
    print("=" * 60)
    print("AIRLINE API INTEGRATION TEST")
    print("=" * 60)
    print()
    
    # Example flight number (American Airlines flight 001)
    flight_number = "AA001"
    
    # Check for API keys in environment variables
    # You can set these in your terminal before running:
    # export FLIGHTAWARE_API_KEY="your_key_here"
    # export AVIATIONSTACK_KEY="your_key_here"
    # export AMADEUS_CLIENT_ID="your_id_here"
    # export AMADEUS_CLIENT_SECRET="your_secret_here"
    
    print("STEP-BY-STEP INSTRUCTIONS TO GET API ACCESS:")
    print("-" * 60)
    print()
    
    print("RECOMMENDED: Amadeus API (Most comprehensive, good free tier)")
    print("1. Go to: https://developers.amadeus.com/")
    print("2. Click 'Register' and create a free account")
    print("3. Once logged in, go to 'My Apps'")
    print("4. Click 'Create New App'")
    print("5. Give it a name like 'PathFind Flight Lookup'")
    print("6. You'll get an API Key and API Secret")
    print("7. Set them as environment variables:")
    print("   export AMADEUS_CLIENT_ID='your_api_key'")
    print("   export AMADEUS_CLIENT_SECRET='your_api_secret'")
    print("8. Run this script again")
    print()
    
    print("ALTERNATIVE 1: FlightAware (Best for real-time tracking)")
    print("1. Go to: https://flightaware.com/commercial/aeroapi/")
    print("2. Sign up for free account")
    print("3. Get API key from dashboard")
    print("4. Set: export FLIGHTAWARE_API_KEY='your_key'")
    print()
    
    print("ALTERNATIVE 2: AviationStack (Simple to use)")
    print("1. Go to: https://aviationstack.com/")
    print("2. Sign up for free account")
    print("3. Get Access Key from dashboard")
    print("4. Set: export AVIATIONSTACK_KEY='your_key'")
    print()
    
    print("-" * 60)
    print()
    
    # Test with available API keys
    if os.getenv('AMADEUS_CLIENT_ID') and os.getenv('AMADEUS_CLIENT_SECRET'):
        print("Testing Amadeus API...")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        result = test_amadeus(
            os.getenv('AMADEUS_CLIENT_ID'),
            os.getenv('AMADEUS_CLIENT_SECRET'),
            flight_number,
            tomorrow
        )
        if result:
            print("SUCCESS! Flight data retrieved:")
            print(json.dumps(result, indent=2))
    
    elif os.getenv('FLIGHTAWARE_API_KEY'):
        print("Testing FlightAware API...")
        result = test_flightaware(os.getenv('FLIGHTAWARE_API_KEY'), flight_number)
        if result:
            print("SUCCESS! Flight data retrieved:")
            print(json.dumps(result, indent=2))
    
    elif os.getenv('AVIATIONSTACK_KEY'):
        print("Testing AviationStack API...")
        result = test_aviationstack(os.getenv('AVIATIONSTACK_KEY'), flight_number)
        if result:
            print("SUCCESS! Flight data retrieved:")
            print(json.dumps(result, indent=2))
    
    else:
        print("⚠️  No API credentials found!")
        print()
        print("Please follow the instructions above to get API credentials,")
        print("then set them as environment variables and run this script again.")
        print()
        print("For example, after getting Amadeus credentials:")
        print("  export AMADEUS_CLIENT_ID='your_api_key_here'")
        print("  export AMADEUS_CLIENT_SECRET='your_api_secret_here'")
        print("  python airline_api_test.py")

if __name__ == "__main__":
    main()