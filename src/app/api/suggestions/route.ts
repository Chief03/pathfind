import { NextRequest, NextResponse } from 'next/server'

// Mock event data aggregator - in production, this would call real APIs
// like Ticketmaster, Eventbrite, Google Places, etc.

interface EventSuggestion {
  id: string
  title: string
  category: string
  description: string
  location?: string
  price?: number | 'free'
  duration?: string
  rating?: number
  image?: string
  requiresTicket?: boolean
  bookingUrl?: string
  tags?: string[]
  date?: string
  startTime?: string
  endTime?: string
  source?: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const city = searchParams.get('city')
  const startDate = searchParams.get('start')
  const endDate = searchParams.get('end')
  
  if (!city || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing required parameters: city, start, end' },
      { status: 400 }
    )
  }

  try {
    // In production, aggregate data from multiple sources
    const suggestions = await fetchAggregatedSuggestions(city, startDate, endDate)
    
    // Cache control headers
    const response = NextResponse.json(suggestions)
    response.headers.set('Cache-Control', 's-maxage=86400, stale-while-revalidate') // 24 hour cache
    
    return response
  } catch (error) {
    console.error('Error fetching suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}

async function fetchAggregatedSuggestions(
  city: string,
  startDate: string,
  endDate: string
): Promise<EventSuggestion[]> {
  const suggestions: EventSuggestion[] = []
  
  // Fetch from multiple sources in parallel
  const [
    ticketmasterEvents,
    genericAttractions,
    restaurants,
    freeActivities
  ] = await Promise.all([
    fetchTicketmasterEvents(city, startDate, endDate),
    fetchGenericAttractions(city),
    fetchRestaurants(city),
    fetchFreeActivities(city)
  ])
  
  // Combine and dedupe
  suggestions.push(
    ...ticketmasterEvents,
    ...genericAttractions,
    ...restaurants,
    ...freeActivities
  )
  
  // Sort by relevance/popularity
  return suggestions.sort((a, b) => {
    // Prioritize by rating, then by whether it requires tickets
    const ratingA = a.rating || 0
    const ratingB = b.rating || 0
    if (ratingA !== ratingB) return ratingB - ratingA
    
    if (a.requiresTicket && !b.requiresTicket) return -1
    if (!a.requiresTicket && b.requiresTicket) return 1
    
    return 0
  })
}

async function fetchTicketmasterEvents(city: string, startDate: string, endDate: string): Promise<EventSuggestion[]> {
  // In production, use Ticketmaster Discovery API
  // const apiKey = process.env.TICKETMASTER_API_KEY
  // const response = await fetch(
  //   `https://app.ticketmaster.com/discovery/v2/events?apikey=${apiKey}&city=${city}&startDateTime=${startDate}&endDateTime=${endDate}`
  // )
  
  // Mock data for now
  return [
    {
      id: `tm-${city}-1`,
      title: `${city} Symphony Orchestra`,
      category: 'concert',
      description: 'Classical music performance at the city concert hall',
      location: `${city} Concert Hall`,
      price: 75,
      duration: '2 hours',
      rating: 4.8,
      requiresTicket: true,
      bookingUrl: 'https://ticketmaster.com',
      tags: ['music', 'classical', 'evening'],
      date: startDate,
      startTime: '20:00',
      source: 'Ticketmaster'
    },
    {
      id: `tm-${city}-2`,
      title: 'Comedy Night Live',
      category: 'nightlife',
      description: 'Stand-up comedy show featuring local and touring comedians',
      location: `${city} Comedy Club`,
      price: 35,
      duration: '90 minutes',
      rating: 4.5,
      requiresTicket: true,
      bookingUrl: 'https://ticketmaster.com',
      tags: ['comedy', 'nightlife', 'entertainment'],
      date: startDate,
      startTime: '21:30',
      source: 'Ticketmaster'
    }
  ]
}

async function fetchGenericAttractions(city: string): Promise<EventSuggestion[]> {
  // In production, use Google Places or Yelp API
  return [
    {
      id: `attr-${city}-1`,
      title: `${city} Museum of Art`,
      category: 'cultural',
      description: 'Explore local and international art collections',
      location: `Downtown ${city}`,
      price: 25,
      duration: '2-3 hours',
      rating: 4.6,
      tags: ['museum', 'art', 'culture', 'indoor'],
      source: 'Google Places'
    },
    {
      id: `attr-${city}-2`,
      title: `${city} Botanical Gardens`,
      category: 'outdoor',
      description: 'Beautiful gardens with native and exotic plants',
      location: `${city} Park District`,
      price: 15,
      duration: '1-2 hours',
      rating: 4.7,
      tags: ['nature', 'outdoor', 'family-friendly'],
      source: 'Google Places'
    },
    {
      id: `attr-${city}-3`,
      title: 'Historic Downtown Walking Tour',
      category: 'attraction',
      description: `Guided tour of ${city}'s historic district`,
      location: `Downtown ${city}`,
      price: 20,
      duration: '90 minutes',
      rating: 4.4,
      tags: ['history', 'walking', 'guided-tour'],
      source: 'Viator'
    }
  ]
}

async function fetchRestaurants(city: string): Promise<EventSuggestion[]> {
  // In production, use Yelp Fusion API
  return [
    {
      id: `rest-${city}-1`,
      title: 'The Local Kitchen',
      category: 'restaurant',
      description: 'Farm-to-table restaurant featuring local ingredients',
      location: `${city} Arts District`,
      price: 35,
      rating: 4.5,
      tags: ['dinner', 'local-cuisine', 'date-night'],
      source: 'Yelp'
    },
    {
      id: `rest-${city}-2`,
      title: `${city} Food Hall`,
      category: 'restaurant',
      description: 'Multiple vendors offering diverse cuisines',
      location: `Downtown ${city}`,
      price: 15,
      rating: 4.3,
      tags: ['lunch', 'variety', 'casual'],
      source: 'Yelp'
    },
    {
      id: `rest-${city}-3`,
      title: 'Rooftop Bar & Grill',
      category: 'nightlife',
      description: 'Cocktails and small plates with city views',
      location: `${city} Tower`,
      price: 40,
      rating: 4.6,
      tags: ['drinks', 'views', 'evening'],
      source: 'Yelp'
    }
  ]
}

async function fetchFreeActivities(city: string): Promise<EventSuggestion[]> {
  return [
    {
      id: `free-${city}-1`,
      title: `${city} Central Park`,
      category: 'outdoor',
      description: 'Large urban park with trails, playgrounds, and picnic areas',
      location: `Central ${city}`,
      price: 'free',
      duration: 'Flexible',
      rating: 4.5,
      tags: ['park', 'outdoor', 'family-friendly', 'free'],
      source: 'Local'
    },
    {
      id: `free-${city}-2`,
      title: 'Farmers Market',
      category: 'activity',
      description: 'Local produce, crafts, and food vendors',
      location: `${city} Square`,
      price: 'free',
      duration: '1-2 hours',
      rating: 4.4,
      tags: ['shopping', 'local', 'weekend', 'free'],
      source: 'Local'
    },
    {
      id: `free-${city}-3`,
      title: 'Beach/Lake Day',
      category: 'outdoor',
      description: 'Relax by the water, swim, or play beach sports',
      location: `${city} Beach`,
      price: 'free',
      duration: 'Half day',
      rating: 4.6,
      tags: ['beach', 'outdoor', 'summer', 'free'],
      source: 'Local'
    }
  ]
}