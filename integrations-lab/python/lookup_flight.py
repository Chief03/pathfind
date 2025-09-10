#!/usr/bin/env python3
"""
Look up specific flight details using Amadeus API
Usage: python3 lookup_flight.py <flight_number>
Example: python3 lookup_flight.py "F9 1490"
Example: python3 lookup_flight.py AA123
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
    else:
        print(f"❌ Authentication failed: {response.status_code}")
        return None

def parse_flight_number(flight_input):
    """Parse flight number from various formats"""
    # Remove extra spaces and make uppercase
    flight_input = flight_input.strip().upper()
    
    # Handle space-separated format (e.g., "F9 1490")
    if ' ' in flight_input:
        parts = flight_input.split()
        if len(parts) >= 2:
            carrier = parts[0]
            number = parts[1]
        else:
            carrier = flight_input[:2]
            number = flight_input[2:]
    else:
        # Extract carrier code (first 2 letters) and flight number
        i = 0
        while i < len(flight_input) and flight_input[i].isalpha():
            i += 1
        carrier = flight_input[:i]
        number = flight_input[i:]
    
    return carrier, number

def lookup_flight(token: str, flight_number: str, date: str = None):
    """Look up flight details from Amadeus API"""
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    carrier_code, flight_num = parse_flight_number(flight_number)
    
    if not date:
        # Try today and tomorrow
        dates = [
            datetime.now().strftime('%Y-%m-%d'),
            (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
            (datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d')
        ]
    else:
        dates = [date]
    
    print(f"\n✈️  Looking up flight: {carrier_code} {flight_num}")
    print("=" * 60)
    
    # 1. Get airline information
    print(f"\n📋 Airline Information:")
    url = "https://test.api.amadeus.com/v1/reference-data/airlines"
    params = {'airlineCodes': carrier_code}
    
    airline_name = carrier_code  # Default
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        if data.get('data'):
            airline = data['data'][0]
            airline_name = airline.get('businessName', airline.get('commonName', carrier_code))
            print(f"   Airline: {airline_name}")
            print(f"   IATA Code: {carrier_code}")
    
    # 2. Try to find flight schedules
    print(f"\n🔍 Searching for flight schedules...")
    found_flight = False
    
    for check_date in dates:
        print(f"\n   Checking {check_date}:")
        
        # Try schedule endpoint
        url = "https://test.api.amadeus.com/v2/schedule/flights"
        params = {
            'carrierCode': carrier_code,
            'flightNumber': flight_num,
            'scheduledDepartureDate': check_date
        }
        
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            if data.get('data'):
                found_flight = True
                for flight in data['data']:
                    print(f"\n   ✅ FLIGHT FOUND!")
                    print(f"   Flight: {carrier_code}{flight_num}")
                    print(f"   Date: {check_date}")
                    
                    # Parse flight segments
                    for segment in flight.get('flightSegments', []):
                        departure = segment.get('departure', {})
                        arrival = segment.get('arrival', {})
                        
                        print(f"\n   Departure:")
                        print(f"      Airport: {departure.get('iataCode', 'N/A')}")
                        print(f"      Terminal: {departure.get('terminal', 'N/A')}")
                        print(f"      Time: {departure.get('at', 'N/A')}")
                        
                        print(f"\n   Arrival:")
                        print(f"      Airport: {arrival.get('iataCode', 'N/A')}")
                        print(f"      Terminal: {arrival.get('terminal', 'N/A')}")
                        print(f"      Time: {arrival.get('at', 'N/A')}")
                        
                        print(f"\n   Aircraft: {segment.get('aircraft', {}).get('code', 'N/A')}")
                        print(f"   Duration: {segment.get('duration', 'N/A')}")
                break
        else:
            print(f"      No schedule found")
    
    if not found_flight:
        # Try searching for flights by route (if we can guess common routes)
        print(f"\n💡 Flight not found in schedules. Searching for similar flights...")
        
        # Common routes for carriers
        common_routes = {
            'F9': [('DEN', 'LAS'), ('DEN', 'PHX'), ('DEN', 'LAX')],  # Frontier hub routes
            'AA': [('DFW', 'LAX'), ('JFK', 'LAX'), ('ORD', 'DFW')],  # American hub routes
            'UA': [('ORD', 'LAX'), ('EWR', 'SFO'), ('DEN', 'ORD')],  # United hub routes
            'DL': [('ATL', 'LAX'), ('JFK', 'LAX'), ('DTW', 'ATL')],  # Delta hub routes
        }
        
        if carrier_code in common_routes:
            origin, destination = common_routes[carrier_code][0]
            print(f"\n   Searching {carrier_code} flights from {origin} to {destination}...")
            
            url = "https://test.api.amadeus.com/v2/shopping/flight-offers"
            params = {
                'originLocationCode': origin,
                'destinationLocationCode': destination,
                'departureDate': dates[1],  # Tomorrow
                'adults': '1',
                'max': '5',
                'includedAirlineCodes': carrier_code
            }
            
            response = requests.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get('data'):
                    print(f"\n   Found {len(data['data'])} {airline_name} flights on this route:")
                    flights_seen = set()
                    for offer in data['data']:
                        for itinerary in offer.get('itineraries', []):
                            for segment in itinerary.get('segments', []):
                                if segment.get('carrierCode') == carrier_code:
                                    flight_key = f"{segment.get('carrierCode')}{segment.get('number')}"
                                    if flight_key not in flights_seen:
                                        flights_seen.add(flight_key)
                                        print(f"      • {flight_key} at {segment.get('departure', {}).get('at', 'N/A')}")
    
    print("\n" + "=" * 60)
    print("📊 Search complete!")
    
    if not found_flight:
        print(f"\n⚠️  Note: Flight {carrier_code} {flight_num} not found in current schedules.")
        print("   This could mean:")
        print("   • The flight operates on different days")
        print("   • It's a seasonal flight")
        print("   • The flight number might be incorrect")
        print("\n💡 Tip: Try searching for the flight on the airline's website")
        print(f"   or Google '{airline_name} {flight_num}' for current schedule")

def main():
    if len(sys.argv) < 2:
        print("❌ Please provide a flight number")
        print("Usage: python3 lookup_flight.py <flight_number>")
        print("Examples:")
        print("  python3 lookup_flight.py 'F9 1490'")
        print("  python3 lookup_flight.py AA123")
        print("  python3 lookup_flight.py UA456")
        sys.exit(1)
    
    flight_number = sys.argv[1]
    
    # Optional: date parameter
    date = None
    if len(sys.argv) > 2:
        date = sys.argv[2]
    
    print("=" * 60)
    print("AMADEUS FLIGHT LOOKUP")
    print("=" * 60)
    
    # Load credentials
    creds = load_env_file(env_path)
    if not creds.get('AMADEUS_CLIENT_ID') or not creds.get('AMADEUS_CLIENT_SECRET'):
        print("❌ Could not load Amadeus credentials from .env file")
        return
    
    # Get authentication token
    print("🔐 Authenticating...")
    token = get_amadeus_token(
        creds['AMADEUS_CLIENT_ID'],
        creds['AMADEUS_CLIENT_SECRET']
    )
    
    if not token:
        print("❌ Failed to authenticate")
        return
    
    print("✅ Authentication successful")
    
    # Look up the flight
    lookup_flight(token, flight_number, date)

if __name__ == "__main__":
    main()