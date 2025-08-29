// Flight number parser and lookup utilities

// Common airline codes mapping
const AIRLINE_CODES: Record<string, string> = {
  'AA': 'American Airlines',
  'DL': 'Delta Air Lines',
  'UA': 'United Airlines',
  'WN': 'Southwest Airlines',
  'B6': 'JetBlue Airways',
  'AS': 'Alaska Airlines',
  'NK': 'Spirit Airlines',
  'F9': 'Frontier Airlines',
  'G4': 'Allegiant Air',
  'SY': 'Sun Country Airlines',
  'BA': 'British Airways',
  'AF': 'Air France',
  'LH': 'Lufthansa',
  'EK': 'Emirates',
  'QR': 'Qatar Airways',
  'SQ': 'Singapore Airlines',
  'AC': 'Air Canada',
  'QF': 'Qantas',
  'NH': 'All Nippon Airways',
  'JL': 'Japan Airlines',
  'KE': 'Korean Air',
  'CX': 'Cathay Pacific',
  'TK': 'Turkish Airlines',
  'EY': 'Etihad Airways',
  'LX': 'SWISS',
  'KL': 'KLM',
  'IB': 'Iberia',
  'AZ': 'Alitalia',
  'OS': 'Austrian Airlines',
  'SK': 'SAS',
  'AY': 'Finnair',
  'TP': 'TAP Air Portugal',
  'LO': 'LOT Polish Airlines',
}

export interface FlightInfo {
  airline: string
  flightNumber: string
  departureAirport?: string
  arrivalAirport?: string
  departureTime?: string
  arrivalTime?: string
  status?: string
  aircraft?: string
}

export function parseFlightNumber(input: string): { airline: string, number: string } | null {
  // Remove spaces and convert to uppercase
  const cleaned = input.replace(/\s+/g, '').toUpperCase()
  
  // Match pattern: 2-3 letter airline code followed by 1-4 digits
  const match = cleaned.match(/^([A-Z]{2,3})(\d{1,4})$/)
  
  if (match) {
    const [_, airlineCode, flightNum] = match
    const airlineName = AIRLINE_CODES[airlineCode] || airlineCode
    return {
      airline: airlineName,
      number: `${airlineCode}${flightNum}`
    }
  }
  
  return null
}

// Mock flight lookup - replace with real API call
export async function lookupFlight(flightNumber: string, date: string): Promise<FlightInfo | null> {
  const parsed = parseFlightNumber(flightNumber)
  if (!parsed) return null

  // In a real implementation, you would call an API like:
  // - FlightAware API
  // - AviationStack API
  // - FlightStats API
  // - OpenSky Network API
  
  // For now, return mock data based on common routes
  const mockFlights: Record<string, Partial<FlightInfo>> = {
    'AA3421': {
      departureAirport: 'Dallas/Fort Worth (DFW)',
      arrivalAirport: 'Denver (DEN)',
      departureTime: '10:30',
      arrivalTime: '11:45',
      aircraft: 'Boeing 737-800'
    },
    'UA1234': {
      departureAirport: 'San Francisco (SFO)',
      arrivalAirport: 'Denver (DEN)',
      departureTime: '08:00',
      arrivalTime: '11:30',
      aircraft: 'Airbus A320'
    },
    'DL456': {
      departureAirport: 'Atlanta (ATL)',
      arrivalAirport: 'Los Angeles (LAX)',
      departureTime: '13:15',
      arrivalTime: '14:45',
      aircraft: 'Boeing 757-200'
    },
    'WN789': {
      departureAirport: 'Chicago Midway (MDW)',
      arrivalAirport: 'Las Vegas (LAS)',
      departureTime: '15:20',
      arrivalTime: '17:05',
      aircraft: 'Boeing 737-700'
    }
  }

  const flightKey = parsed.number
  const mockData = mockFlights[flightKey]

  if (mockData) {
    return {
      airline: parsed.airline,
      flightNumber: parsed.number,
      ...mockData
    } as FlightInfo
  }

  // Return basic info if no mock data found
  return {
    airline: parsed.airline,
    flightNumber: parsed.number
  }
}

// Function to integrate with real flight APIs
export async function fetchRealFlightData(flightNumber: string, date: string): Promise<FlightInfo | null> {
  // Example implementation with a real API (you'll need an API key)
  /*
  try {
    const response = await fetch(`https://api.flightapi.io/compschedule/YOUR_API_KEY?flight=${flightNumber}&date=${date}`)
    const data = await response.json()
    
    if (data && data.length > 0) {
      const flight = data[0]
      return {
        airline: flight.airline.name,
        flightNumber: flightNumber,
        departureAirport: `${flight.departure.airport} (${flight.departure.iata})`,
        arrivalAirport: `${flight.arrival.airport} (${flight.arrival.iata})`,
        departureTime: flight.departure.scheduled,
        arrivalTime: flight.arrival.scheduled,
        status: flight.status,
        aircraft: flight.aircraft?.model
      }
    }
  } catch (error) {
    console.error('Error fetching flight data:', error)
  }
  */
  
  // For now, use the mock lookup
  return lookupFlight(flightNumber, date)
}