'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import { useActivityTracker } from '@/contexts/ActivityTracker'

interface Place {
  id: string
  name: string
  category: string
  description?: string
  rating?: number
  priceLevel?: number // 1-4 scale
  address?: string
  neighborhood?: string
  coordinates?: { lat: number, lng: number }
  hours?: string[]
  website?: string
  phone?: string
  photos?: string[]
  tags?: string[]
  distance?: number
  isOpen?: boolean
  isSaved?: boolean
  placeId?: string // Google/Yelp place ID
}

interface PlacesDiscoveryProps {
  tripData: any
}

const categories = [
  { id: 'all', label: 'All', icon: '🌐' },
  { id: 'food', label: 'Food & Drink', icon: '🍽️' },
  { id: 'classes', label: 'Classes & Workshops', icon: '🎓' },
  { id: 'attractions', label: 'Attractions', icon: '🏛️' },
  { id: 'museums', label: 'Museums & Culture', icon: '🎨' },
  { id: 'outdoors', label: 'Outdoors & Parks', icon: '🌳' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌃' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'experiences', label: 'Tours & Experiences', icon: '🎭' },
  { id: 'free', label: 'Free Activities', icon: '🆓' }
]

const sortOptions = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rating', label: 'Highest Rated' },
  { id: 'distance', label: 'Nearest' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' }
]

export default function PlacesDiscovery({ tripData }: PlacesDiscoveryProps) {
  const [places, setPlaces] = useState<Place[]>([])
  const [savedPlaces, setSavedPlaces] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('recommended')
  const [filters, setFilters] = useState({
    openNow: false,
    kidFriendly: false,
    wheelchairAccessible: false,
    indoor: false,
    outdoor: false,
    priceLevel: 0 // 0 = all, 1-4 = specific levels
  })
  const [searchQuery, setSearchQuery] = useState('')
  const { trackActivity } = useActivityTracker()

  useEffect(() => {
    if (tripData?.id) {
      fetchPlaces()
      fetchSavedPlaces()
    }
  }, [tripData])

  const fetchPlaces = async () => {
    setLoading(true)
    try {
      // In production, this would call Google Places, Yelp, or Foursquare APIs
      // For now, we'll use mock data
      const mockPlaces = generateMockPlaces(tripData.destinationCity)
      setPlaces(mockPlaces)
    } catch (error) {
      console.error('Error fetching places:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSavedPlaces = async () => {
    try {
      const client = generateClient()
      const { data } = await (client as any).models.Place.list({
        filter: { tripId: { eq: tripData.id } }
      })
      setSavedPlaces(data?.map((p: any) => p.placeId) || [])
    } catch (error) {
      console.error('Error fetching saved places:', error)
    }
  }

  const handleSavePlace = async (place: Place) => {
    try {
      const client = generateClient()
      
      if (savedPlaces.includes(place.id)) {
        // Unsave
        const { data: existingPlaces } = await (client as any).models.Place.list({
          filter: { 
            tripId: { eq: tripData.id },
            placeId: { eq: place.id }
          }
        })
        
        if (existingPlaces && existingPlaces.length > 0) {
          await (client as any).models.Place.delete({ id: existingPlaces[0].id })
          setSavedPlaces(savedPlaces.filter(id => id !== place.id))
          trackActivity({
            type: 'delete',
            category: 'place',
            action: `Removed "${place.name}" from saved places`
          })
        }
      } else {
        // Save
        await (client as any).models.Place.create({
          tripId: tripData.id,
          name: place.name,
          category: place.category,
          address: place.address,
          coordinates: place.coordinates,
          rating: place.rating,
          priceLevel: place.priceLevel,
          placeId: place.id,
          notes: place.description
        })
        setSavedPlaces([...savedPlaces, place.id])
        trackActivity({
          type: 'create',
          category: 'place',
          action: `Saved "${place.name}" to places`
        })
      }
    } catch (error) {
      console.error('Error saving place:', error)
    }
  }

  const handleAddToItinerary = async (place: Place) => {
    try {
      const client = generateClient()
      
      // Create an itinerary item from the place
      await (client as any).models.ItineraryItem.create({
        tripId: tripData.id,
        title: place.name,
        location: place.address || tripData.destinationCity,
        category: 'Activity',
        date: tripData.startDate, // Default to first day
        description: place.description,
        price: place.priceLevel ? place.priceLevel * 15 : 0, // Rough estimate
        eventSource: 'Places'
      })
      
      trackActivity({
        type: 'create',
        category: 'trip',
        action: `Added "${place.name}" to itinerary`
      })
      
      alert(`Added "${place.name}" to your itinerary!`)
    } catch (error) {
      console.error('Error adding to itinerary:', error)
    }
  }

  const openInMaps = (place: Place) => {
    const query = encodeURIComponent(`${place.name} ${place.address || tripData.destinationCity}`)
    window.open(`https://maps.google.com/?q=${query}`, '_blank')
  }

  const getFilteredAndSortedPlaces = () => {
    let filtered = [...places]
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    
    // Apply filters
    if (filters.openNow) {
      filtered = filtered.filter(p => p.isOpen)
    }
    if (filters.kidFriendly) {
      filtered = filtered.filter(p => p.tags?.includes('kid-friendly'))
    }
    if (filters.wheelchairAccessible) {
      filtered = filtered.filter(p => p.tags?.includes('wheelchair-accessible'))
    }
    if (filters.indoor) {
      filtered = filtered.filter(p => p.tags?.includes('indoor'))
    }
    if (filters.outdoor) {
      filtered = filtered.filter(p => p.tags?.includes('outdoor'))
    }
    if (filters.priceLevel > 0) {
      filtered = filtered.filter(p => p.priceLevel === filters.priceLevel)
    }
    
    // Sort
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case 'distance':
        filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0))
        break
      case 'price_low':
        filtered.sort((a, b) => (a.priceLevel || 0) - (b.priceLevel || 0))
        break
      case 'price_high':
        filtered.sort((a, b) => (b.priceLevel || 0) - (a.priceLevel || 0))
        break
    }
    
    return filtered
  }

  const filteredPlaces = getFilteredAndSortedPlaces()

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Discover Places</h2>
        <p className="text-gray-600 mt-1">
          Top recommendations for {tripData?.destinationCity}
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search places..."
            className="w-full px-4 py-3 pl-12 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
            
            {/* Sort */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {sortOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Price Level */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Price Level</label>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(level => (
                  <button
                    key={level}
                    onClick={() => setFilters({...filters, priceLevel: filters.priceLevel === level ? 0 : level})}
                    className={`flex-1 py-2 text-sm rounded transition-colors ${
                      filters.priceLevel === level && level > 0
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {level === 0 ? 'All' : '$'.repeat(level)}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Filters */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.openNow}
                  onChange={(e) => setFilters({...filters, openNow: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Open Now</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.kidFriendly}
                  onChange={(e) => setFilters({...filters, kidFriendly: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Kid Friendly</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.wheelchairAccessible}
                  onChange={(e) => setFilters({...filters, wheelchairAccessible: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Wheelchair Accessible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.indoor}
                  onChange={(e) => setFilters({...filters, indoor: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Indoor</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.outdoor}
                  onChange={(e) => setFilters({...filters, outdoor: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Outdoor</span>
              </label>
            </div>
          </div>
        </div>

        {/* Places Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="text-gray-600 mt-4">Discovering amazing places...</p>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No places found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPlaces.map(place => (
                <div key={place.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Place Image */}
                  {place.photos && place.photos[0] && (
                    <div className="h-48 bg-gray-200 relative">
                      <img 
                        src={place.photos[0]} 
                        alt={place.name}
                        className="w-full h-full object-cover"
                      />
                      {savedPlaces.includes(place.id) && (
                        <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs">
                          Saved
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="p-6">
                    {/* Header */}
                    <div className="mb-3">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-gray-900">{place.name}</h3>
                        {place.rating && (
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            <span className="text-sm font-medium">{place.rating}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{place.category}</p>
                    </div>

                    {/* Description */}
                    {place.description && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {place.description}
                      </p>
                    )}

                    {/* Details */}
                    <div className="space-y-2 mb-4">
                      {place.address && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{place.address}</span>
                        </div>
                      )}
                      {place.priceLevel && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{'$'.repeat(place.priceLevel)}</span>
                          <span className="text-gray-400">{'$'.repeat(4 - place.priceLevel)}</span>
                        </div>
                      )}
                      {place.isOpen !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full ${place.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className={place.isOpen ? 'text-green-600' : 'text-red-600'}>
                            {place.isOpen ? 'Open Now' : 'Closed'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {place.tags && place.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {place.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSavePlace(place)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          savedPlaces.includes(place.id)
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {savedPlaces.includes(place.id) ? '✓ Saved' : 'Save'}
                      </button>
                      <button
                        onClick={() => handleAddToItinerary(place)}
                        className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        Add to Itinerary
                      </button>
                      <button
                        onClick={() => openInMaps(place)}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        📍
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Mock data generator
function generateMockPlaces(city: string): Place[] {
  return [
    {
      id: '1',
      name: `${city} Museum of Art`,
      category: 'museums',
      description: 'World-class art collection spanning centuries of human creativity',
      rating: 4.7,
      priceLevel: 2,
      address: `123 Museum Way, ${city}`,
      neighborhood: 'Museum District',
      isOpen: true,
      tags: ['indoor', 'wheelchair-accessible', 'educational'],
      distance: 2.3,
      photos: ['https://via.placeholder.com/400x300']
    },
    {
      id: '2',
      name: 'Central Park',
      category: 'outdoors',
      description: 'Beautiful urban park with trails, playgrounds, and picnic areas',
      rating: 4.5,
      priceLevel: 0,
      address: `Central Avenue, ${city}`,
      isOpen: true,
      tags: ['outdoor', 'kid-friendly', 'free', 'wheelchair-accessible'],
      distance: 1.2,
      photos: ['https://via.placeholder.com/400x300']
    },
    {
      id: '3',
      name: 'The Local Kitchen',
      category: 'food',
      description: 'Farm-to-table restaurant featuring seasonal local ingredients',
      rating: 4.8,
      priceLevel: 3,
      address: `456 Main Street, ${city}`,
      neighborhood: 'Downtown',
      isOpen: false,
      tags: ['indoor', 'date-night', 'reservations-recommended'],
      distance: 0.8,
      photos: ['https://via.placeholder.com/400x300']
    },
    {
      id: '4',
      name: 'Rooftop Bar & Lounge',
      category: 'nightlife',
      description: 'Cocktails with panoramic city views',
      rating: 4.4,
      priceLevel: 3,
      address: `789 Sky Tower, ${city}`,
      isOpen: false,
      tags: ['indoor', 'outdoor', '21+', 'views'],
      distance: 3.1,
      photos: ['https://via.placeholder.com/400x300']
    },
    {
      id: '5',
      name: 'Pottery Workshop',
      category: 'classes',
      description: 'Learn pottery making in a fun, relaxed environment',
      rating: 4.9,
      priceLevel: 2,
      address: `321 Craft Lane, ${city}`,
      isOpen: true,
      tags: ['indoor', 'hands-on', 'beginner-friendly'],
      distance: 2.8,
      photos: ['https://via.placeholder.com/400x300']
    },
    {
      id: '6',
      name: 'Historic Downtown Walking Tour',
      category: 'experiences',
      description: `Discover ${city}'s rich history on this guided tour`,
      rating: 4.6,
      priceLevel: 2,
      address: `Visitor Center, ${city}`,
      isOpen: true,
      tags: ['outdoor', 'educational', 'guided-tour'],
      distance: 0.5,
      photos: ['https://via.placeholder.com/400x300']
    }
  ]
}