// Mock event and activity suggestions
// In production, these would come from APIs like Ticketmaster, Yelp, Google Places, etc.

export interface EventSuggestion {
  id: string
  title: string
  category: 'activity' | 'concert' | 'restaurant' | 'attraction' | 'nightlife' | 'outdoor' | 'cultural'
  description: string
  location?: string
  price?: number | 'free'
  duration?: string
  rating?: number
  image?: string
  requiresTicket?: boolean
  bookingUrl?: string
  tags?: string[]
}

// Get suggestions based on destination
export function getEventSuggestions(destination: string): EventSuggestion[] {
  // This is mock data - in production, call real APIs
  const baseSuggestions: EventSuggestion[] = [
    // Free/Custom Activities
    {
      id: 'game-night',
      title: 'Game Night at Accommodation',
      category: 'activity',
      description: 'Host a fun game night with drinking games, board games, or card games',
      price: 'free',
      duration: '2-4 hours',
      tags: ['indoor', 'group', 'evening']
    },
    {
      id: 'movie-marathon',
      title: 'Movie Marathon',
      category: 'activity',
      description: 'Cozy movie night with friends, snacks, and your favorite films',
      price: 'free',
      duration: '3-5 hours',
      tags: ['indoor', 'group', 'evening', 'relaxing']
    },
    {
      id: 'pool-day',
      title: 'Pool/Beach Day',
      category: 'outdoor',
      description: 'Relax by the pool or hit the beach for sun and fun',
      price: 'free',
      duration: 'Half day',
      tags: ['outdoor', 'daytime', 'relaxing', 'summer']
    },
    {
      id: 'cooking-together',
      title: 'Group Cooking Session',
      category: 'activity',
      description: 'Cook a meal together - great for bonding and saving money',
      price: 'free',
      duration: '2-3 hours',
      tags: ['indoor', 'group', 'mealtime']
    },
    
    // Ticketed Events (these would be dynamic based on location/dates)
    {
      id: 'concert-1',
      title: 'Live Music at Red Rocks',
      category: 'concert',
      description: 'Outdoor amphitheater concert experience',
      location: 'Red Rocks Amphitheatre',
      price: 75,
      duration: '3 hours',
      requiresTicket: true,
      bookingUrl: 'https://example.com/tickets',
      tags: ['music', 'outdoor', 'evening', 'ticketed']
    },
    {
      id: 'concert-2',
      title: 'Jazz Night at Blue Note',
      category: 'nightlife',
      description: 'Intimate jazz performance with cocktails',
      location: 'Blue Note Jazz Club',
      price: 45,
      duration: '2 hours',
      requiresTicket: true,
      tags: ['music', 'indoor', 'evening', '21+']
    },
    
    // Popular Attractions
    {
      id: 'museum-1',
      title: 'Art Museum Visit',
      category: 'cultural',
      description: 'Explore local art and cultural exhibits',
      location: 'City Art Museum',
      price: 25,
      duration: '2-3 hours',
      rating: 4.5,
      tags: ['cultural', 'indoor', 'daytime', 'educational']
    },
    {
      id: 'tour-1',
      title: 'City Walking Tour',
      category: 'attraction',
      description: 'Guided tour of historic downtown area',
      location: 'Downtown Meeting Point',
      price: 35,
      duration: '2 hours',
      rating: 4.8,
      tags: ['outdoor', 'daytime', 'walking', 'historical']
    },
    
    // Restaurants & Bars
    {
      id: 'restaurant-1',
      title: 'Rooftop Bar Sunset',
      category: 'nightlife',
      description: 'Cocktails with panoramic city views',
      location: 'Sky Bar',
      price: 50,
      duration: '2 hours',
      rating: 4.6,
      tags: ['drinks', 'views', 'evening', '21+']
    },
    {
      id: 'restaurant-2',
      title: 'Local Food Market',
      category: 'restaurant',
      description: 'Sample local cuisine from various vendors',
      location: 'Central Market',
      price: 20,
      duration: '1-2 hours',
      rating: 4.7,
      tags: ['food', 'local', 'casual', 'daytime']
    },
    
    // Outdoor Activities
    {
      id: 'hike-1',
      title: 'Morning Hike',
      category: 'outdoor',
      description: 'Scenic trail with mountain views',
      location: 'Trailhead Park',
      price: 'free',
      duration: '3 hours',
      rating: 4.9,
      tags: ['outdoor', 'exercise', 'morning', 'nature']
    },
    {
      id: 'adventure-1',
      title: 'Zip Line Adventure',
      category: 'outdoor',
      description: 'Thrilling zip line course through the forest',
      location: 'Adventure Park',
      price: 89,
      duration: '3 hours',
      requiresTicket: true,
      rating: 4.8,
      tags: ['outdoor', 'adventure', 'daytime', 'adrenaline']
    }
  ]
  
  // In production, filter based on actual destination
  // For now, return a mix of suggestions
  return baseSuggestions
}

// Categories for filtering
export const eventCategories = [
  { id: 'all', label: 'All', icon: '🎯' },
  { id: 'activity', label: 'Activities', icon: '🎮' },
  { id: 'concert', label: 'Concerts', icon: '🎵' },
  { id: 'restaurant', label: 'Food & Drink', icon: '🍽️' },
  { id: 'attraction', label: 'Attractions', icon: '🏛️' },
  { id: 'nightlife', label: 'Nightlife', icon: '🍹' },
  { id: 'outdoor', label: 'Outdoor', icon: '🏔️' },
  { id: 'cultural', label: 'Cultural', icon: '🎨' }
]