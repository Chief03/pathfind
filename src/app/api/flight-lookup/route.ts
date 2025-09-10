import { NextRequest, NextResponse } from 'next/server'

// Types for Amadeus API responses
interface AmadeusToken {
  access_token: string
  expires_in: number
}

interface AmadeusSegment {
  departure: {
    iataCode: string
    terminal?: string
    at: string
  }
  arrival: {
    iataCode: string
    terminal?: string
    at: string
  }
  carrierCode: string
  number: string
  aircraft?: {
    code: string
  }
  duration?: string
  numberOfStops?: number
}

interface AmadeusAirline {
  iataCode: string
  businessName: string
  commonName?: string
}

interface AmadeusAirport {
  iataCode: string
  name: string
  address?: {
    cityName: string
    countryName: string
  }
}

// Get Amadeus OAuth token
async function getAmadeusToken(): Promise<string | null> {
  const clientId = process.env.AMADEUS_CLIENT_ID
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Missing Amadeus credentials in environment variables')
    return null
  }

  try {
    const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!response.ok) {
      console.error('Failed to get Amadeus token:', response.status)
      return null
    }

    const data: AmadeusToken = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Error getting Amadeus token:', error)
    return null
  }
}

// Get airline details
async function getAirlineInfo(token: string, carrierCode: string): Promise<AmadeusAirline | null> {
  try {
    const response = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/airlines?airlineCodes=${carrierCode}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Failed to get airline info:', response.status)
      return null
    }

    const data = await response.json()
    if (data.data && data.data.length > 0) {
      return data.data[0]
    }
    return null
  } catch (error) {
    console.error('Error getting airline info:', error)
    return null
  }
}

// Get airport details
async function getAirportInfo(token: string, iataCode: string): Promise<AmadeusAirport | null> {
  try {
    const response = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=AIRPORT&keyword=${iataCode}&page[limit]=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Failed to get airport info:', response.status)
      return null
    }

    const data = await response.json()
    if (data.data && data.data.length > 0) {
      const airport = data.data[0]
      return {
        iataCode: airport.iataCode,
        name: airport.name,
        address: airport.address,
      }
    }
    return null
  } catch (error) {
    console.error('Error getting airport info:', error)
    return null
  }
}

// Parse flight number (handles "AA123" or "AA 123")
function parseFlightNumber(input: string): { carrier: string; number: string } {
  const cleaned = input.trim().toUpperCase()
  
  // Handle space-separated format
  if (cleaned.includes(' ')) {
    const parts = cleaned.split(' ')
    return {
      carrier: parts[0],
      number: parts[1],
    }
  }
  
  // Extract carrier code and number
  let i = 0
  while (i < cleaned.length && /[A-Z]/.test(cleaned[i])) {
    i++
  }
  
  return {
    carrier: cleaned.slice(0, i),
    number: cleaned.slice(i),
  }
}

// Main API handler
export async function POST(request: NextRequest) {
  try {
    const { flightNumber, date } = await request.json()

    if (!flightNumber) {
      return NextResponse.json(
        { error: 'Flight number is required' },
        { status: 400 }
      )
    }

    // Get Amadeus token
    const token = await getAmadeusToken()
    if (!token) {
      return NextResponse.json(
        { error: 'Failed to authenticate with flight data service' },
        { status: 500 }
      )
    }

    // Parse flight number
    const { carrier, number } = parseFlightNumber(flightNumber)
    
    // Get airline info
    const airlineInfo = await getAirlineInfo(token, carrier)
    const airlineName = airlineInfo?.businessName || carrier

    // Determine dates to check
    const today = new Date()
    const dates = date 
      ? [date]
      : [
          today.toISOString().split('T')[0],
          new Date(today.getTime() + 86400000).toISOString().split('T')[0], // Tomorrow
        ]

    // Try to find flight offers (this gives us the most comprehensive data)
    console.log(`Looking up flight ${carrier}${number}`)
    
    // Search multiple common routes to find the flight
    const searchDate = dates[0]
    const commonRoutes = [
      { origin: 'JFK', destination: 'LAX' },  // New York to Los Angeles
      { origin: 'LAX', destination: 'JFK' },  // Los Angeles to New York
      { origin: 'ORD', destination: 'LAX' },  // Chicago to Los Angeles
      { origin: 'LAX', destination: 'ORD' },  // Los Angeles to Chicago
      { origin: 'DFW', destination: 'LAX' },  // Dallas to Los Angeles
      { origin: 'LAX', destination: 'DFW' },  // Los Angeles to Dallas
      { origin: 'JFK', destination: 'MIA' },  // New York to Miami
      { origin: 'MIA', destination: 'JFK' },  // Miami to New York
      { origin: 'ATL', destination: 'LAX' },  // Atlanta to Los Angeles
      { origin: 'LAX', destination: 'ATL' },  // Los Angeles to Atlanta
      { origin: 'JFK', destination: 'SFO' },  // New York to San Francisco
      { origin: 'SFO', destination: 'JFK' },  // San Francisco to New York
      { origin: 'BOS', destination: 'LAX' },  // Boston to Los Angeles
      { origin: 'LAX', destination: 'BOS' },  // Los Angeles to Boston
    ]
    
    let response: Response | null = null
    let searchData: any = null
    
    // Try each route until we find flights from this carrier
    for (const route of commonRoutes) {
      console.log(`  Checking ${route.origin}-${route.destination}...`)
      
      response = await fetch(
        `https://test.api.amadeus.com/v2/shopping/flight-offers?` +
        `originLocationCode=${route.origin}&destinationLocationCode=${route.destination}&` +
        `departureDate=${searchDate}&adults=1&max=20&` +
        `includedAirlineCodes=${carrier}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.data && data.data.length > 0) {
          searchData = data
          console.log(`  Found ${data.data.length} ${carrier} flights on ${route.origin}-${route.destination}`)
          break
        }
      }
    }

    if (!searchData || !searchData.data || searchData.data.length === 0) {
      console.error('No flights found for this carrier')
      return NextResponse.json(
        { 
          error: 'Flight not found',
          details: `Could not find ${carrier} flights. This carrier might not be in the Amadeus test database.`
        },
        { status: 404 }
      )
    }
    
    // Find a flight that matches our flight number (if possible)
    let flightData: any = null
    let exactMatch = false
    
    if (searchData.data && searchData.data.length > 0) {
      // Look for exact match first
      for (const offer of searchData.data) {
        for (const itinerary of offer.itineraries || []) {
          for (const segment of itinerary.segments || []) {
            if (segment.carrierCode === carrier && segment.number === number) {
              flightData = segment
              exactMatch = true
              console.log(`  ✓ Found exact match: ${carrier}${number}`)
              break
            }
          }
          if (flightData) break
        }
        if (flightData) break
      }
      
      // If no exact match, use first flight from this carrier as example data
      if (!flightData) {
        console.log(`  No exact match for ${carrier}${number}, using sample ${carrier} flight data`)
        for (const offer of searchData.data) {
          for (const itinerary of offer.itineraries || []) {
            for (const segment of itinerary.segments || []) {
              if (segment.carrierCode === carrier) {
                flightData = segment
                // Note: This is sample data, not the exact flight
                console.log(`  Using ${carrier}${segment.number} as sample data`)
                break
              }
            }
            if (flightData) break
          }
          if (flightData) break
        }
      }
    }

    if (!flightData) {
      return NextResponse.json(
        { 
          error: 'Flight not found',
          details: `No flights found for ${carrier}${number}. This might be a seasonal route or the flight number may have changed.`
        },
        { status: 404 }
      )
    }

    // Get airport details for departure and arrival
    const [departureAirport, arrivalAirport] = await Promise.all([
      getAirportInfo(token, flightData.departure.iataCode),
      getAirportInfo(token, flightData.arrival.iataCode),
    ])

    // Format response for frontend
    const formattedResponse = {
      success: true,
      flightData: {
        airline: airlineName,
        flightNumber: `${carrier}${number}`,
        departureTime: flightData.departure.at,
        arrivalTime: flightData.arrival.at,
        departureAirport: {
          code: flightData.departure.iataCode,
          name: departureAirport?.name || `${flightData.departure.iataCode} Airport`,
          city: departureAirport?.address?.cityName || 'Unknown',
        },
        arrivalAirport: {
          code: flightData.arrival.iataCode,
          name: arrivalAirport?.name || `${flightData.arrival.iataCode} Airport`,
          city: arrivalAirport?.address?.cityName || 'Unknown',
        },
        terminal: flightData.departure.terminal || null,
        duration: flightData.duration || null,
        aircraft: flightData.aircraft?.code || null,
      },
      message: exactMatch 
        ? `Found flight information for ${carrier}${number}`
        : `Using sample ${airlineName} flight data (exact flight ${carrier}${number} not in test database)`,
      exactMatch: exactMatch,
    }

    return NextResponse.json(formattedResponse)
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}