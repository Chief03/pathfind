#!/usr/bin/env python3
"""
Test Amadeus API with credentials from .env file
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
            # Parse the credentials from the file
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
        token_data = response.json()
        print(f"✅ Authentication successful! Token expires in {token_data.get('expires_in', 0)} seconds")
        return token_data['access_token']
    else:
        print(f"❌ Authentication failed: {response.status_code}")
        print(f"Response: {response.text}")
        return None

def test_flight_search(token: str, flight_number: str = "AA001"):
    """Test various Amadeus flight endpoints"""
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    carrier_code = flight_number[:2]  # AA from AA001
    flight_num = flight_number[2:]    # 001 from AA001
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    
    print(f"\n🔍 Testing Amadeus API for flight {flight_number}")
    print("=" * 60)
    
    # Test 1: Flight Offers Search (JFK to LAX as example)
    print(f"\n1. Flight Offers Search (JFK → LAX on {tomorrow}):")
    url = "https://test.api.amadeus.com/v2/shopping/flight-offers"
    params = {
        'originLocationCode': 'JFK',
        'destinationLocationCode': 'LAX',
        'departureDate': tomorrow,
        'adults': '1',
        'max': '3',
        'currencyCode': 'USD'
    }
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {len(data.get('data', []))} flight offers")
        if data.get('data'):
            for i, offer in enumerate(data['data'][:2], 1):
                price = offer.get('price', {}).get('total', 'N/A')
                segments = offer.get('itineraries', [{}])[0].get('segments', [])
                if segments:
                    carrier = segments[0].get('carrierCode', '')
                    flight = segments[0].get('number', '')
                    departure = segments[0].get('departure', {}).get('at', '')
                    arrival = segments[0].get('arrival', {}).get('at', '')
                    print(f"   Option {i}: {carrier}{flight} - ${price} USD")
                    print(f"   Departure: {departure}")
                    print(f"   Arrival: {arrival}")
    else:
        print(f"❌ Error: {response.status_code}")
    
    # Test 2: Airport Information
    print(f"\n2. Airport Information (JFK):")
    url = "https://test.api.amadeus.com/v1/reference-data/locations"
    params = {
        'subType': 'AIRPORT',
        'keyword': 'JFK',
        'page[limit]': '1'
    }
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        if data.get('data'):
            airport = data['data'][0]
            print(f"✅ Airport: {airport.get('name', 'N/A')}")
            print(f"   IATA Code: {airport.get('iataCode', 'N/A')}")
            print(f"   City: {airport.get('address', {}).get('cityName', 'N/A')}")
            print(f"   Country: {airport.get('address', {}).get('countryName', 'N/A')}")
    else:
        print(f"❌ Error: {response.status_code}")
    
    # Test 3: Airline Information
    print(f"\n3. Airline Information ({carrier_code}):")
    url = "https://test.api.amadeus.com/v1/reference-data/airlines"
    params = {
        'airlineCodes': carrier_code
    }
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        if data.get('data'):
            airline = data['data'][0]
            print(f"✅ Airline: {airline.get('businessName', 'N/A')}")
            print(f"   IATA Code: {airline.get('iataCode', 'N/A')}")
            print(f"   Common Name: {airline.get('commonName', 'N/A')}")
    else:
        print(f"❌ Error: {response.status_code}")
    
    # Test 4: Flight Destinations (from NYC)
    print(f"\n4. Popular Destinations from NYC (under $500):")
    url = "https://test.api.amadeus.com/v1/shopping/flight-destinations"
    params = {
        'origin': 'NYC',
        'maxPrice': '500'
    }
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        if data.get('data'):
            print(f"✅ Found {len(data['data'])} destinations under $500")
            for dest in data['data'][:5]:
                print(f"   {dest.get('destination', 'N/A')}: ${dest.get('price', {}).get('total', 'N/A')}")
    else:
        print(f"❌ Error: {response.status_code}")

def main():
    print("=" * 60)
    print("AMADEUS API TEST")
    print("=" * 60)
    
    # Load credentials from .env file
    print(f"\n📂 Loading credentials from: {env_path}")
    creds = load_env_file(env_path)
    
    if not creds.get('AMADEUS_CLIENT_ID') or not creds.get('AMADEUS_CLIENT_SECRET'):
        print("❌ Could not load Amadeus credentials from .env file")
        return
    
    print("✅ Credentials loaded successfully")
    
    # Get authentication token
    print("\n🔐 Authenticating with Amadeus API...")
    token = get_amadeus_token(
        creds['AMADEUS_CLIENT_ID'],
        creds['AMADEUS_CLIENT_SECRET']
    )
    
    if not token:
        print("❌ Failed to authenticate. Please check your credentials.")
        return
    
    # Test the API
    test_flight_search(token)
    
    print("\n" + "=" * 60)
    print("✅ API test complete! The connection is working.")
    print("\nNext steps:")
    print("1. We can now search for real flight data")
    print("2. Store flight schedules in DynamoDB")
    print("3. Connect this to the PathFind app")

if __name__ == "__main__":
    main()