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
  priceLevel?: number
  address?: string
  neighborhood?: string
  coordinates?: { lat: number, lng: number }
  isOpen?: boolean
  tags?: string[]
  distance?: number
}

interface PlacesDiscoveryLuxeFixedProps {
  tripData: any
}

const categories = [
  { id: 'all', label: 'All Places', icon: '🌟', color: 'from-gray-500 to-gray-600' },
  { id: 'restaurant', label: 'Restaurants', icon: '🍽️', color: 'from-orange-500 to-red-600' },
  { id: 'attraction', label: 'Attractions', icon: '🎢', color: 'from-purple-500 to-pink-600' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: 'from-blue-500 to-indigo-600' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌃', color: 'from-violet-500 to-purple-600' },
  { id: 'hotel', label: 'Hotels', icon: '🏨', color: 'from-teal-500 to-cyan-600' },
  { id: 'cafe', label: 'Cafes', icon: '☕', color: 'from-amber-500 to-orange-600' },
  { id: 'park', label: 'Parks', icon: '🌳', color: 'from-green-500 to-emerald-600' },
  { id: 'museum', label: 'Museums', icon: '🏛️', color: 'from-slate-500 to-gray-600' }
]

// Mock place generator function
function generateMockPlaces(city: string): Place[] {
  return [
    {
      id: 'place-1',
      name: `${city} Museum of Art`,
      category: 'museum',
      description: 'World-class art collection spanning centuries',
      rating: 4.7,
      priceLevel: 2,
      address: `123 Museum Way, ${city}`,
      neighborhood: 'Museum District',
      isOpen: true,
      tags: ['indoor', 'wheelchair-accessible', 'educational'],
      distance: 2.3
    },
    {
      id: 'place-2',
      name: 'Central Park',
      category: 'park',
      description: 'Beautiful urban park with trails and picnic areas',
      rating: 4.5,
      priceLevel: 0,
      address: `Central Avenue, ${city}`,
      isOpen: true,
      tags: ['outdoor', 'kid-friendly', 'free'],
      distance: 1.2
    },
    {
      id: 'place-3',
      name: 'The Local Kitchen',
      category: 'restaurant',
      description: 'Farm-to-table restaurant featuring local ingredients',
      rating: 4.8,
      priceLevel: 3,
      address: `456 Main Street, ${city}`,
      neighborhood: 'Downtown',
      isOpen: false,
      tags: ['indoor', 'date-night', 'reservations'],
      distance: 0.8
    },
    {
      id: 'place-4',
      name: 'Rooftop Bar & Lounge',
      category: 'nightlife',
      description: 'Cocktails with panoramic city views',
      rating: 4.4,
      priceLevel: 3,
      address: `789 Sky Tower, ${city}`,
      neighborhood: 'Financial District',
      isOpen: true,
      tags: ['indoor', '21+', 'views'],
      distance: 1.5
    },
    {
      id: 'place-5',
      name: 'Artisan Market',
      category: 'shopping',
      description: 'Local crafts and handmade goods',
      rating: 4.3,
      priceLevel: 2,
      address: `Market Square, ${city}`,
      isOpen: true,
      tags: ['indoor', 'local', 'souvenirs'],
      distance: 0.5
    },
    {
      id: 'place-6',
      name: 'Historic Walking Tour',
      category: 'attraction',
      description: `Guided tour of ${city}'s historic district`,
      rating: 4.6,
      priceLevel: 2,
      address: `Old Town Square, ${city}`,
      isOpen: true,
      tags: ['outdoor', 'educational', 'guided'],
      distance: 1.0
    },
    {
      id: 'place-7',
      name: 'Luxury Spa & Wellness',
      category: 'hotel',
      description: 'Full-service spa with treatments and facilities',
      rating: 4.9,
      priceLevel: 4,
      address: `Spa Boulevard, ${city}`,
      isOpen: true,
      tags: ['indoor', 'relaxation', 'luxury'],
      distance: 3.0
    },
    {
      id: 'place-8',
      name: 'Cozy Coffee House',
      category: 'cafe',
      description: 'Artisan coffee and fresh pastries',
      rating: 4.5,
      priceLevel: 1,
      address: `Corner Cafe Street, ${city}`,
      isOpen: true,
      tags: ['indoor', 'wifi', 'work-friendly'],
      distance: 0.3
    }
  ]
}

export default function PlacesDiscoveryLuxeFixed({ tripData }: PlacesDiscoveryLuxeFixedProps) {
  const [savedPlaces, setSavedPlaces] = useState<any[]>([])
  const [suggestedPlaces, setSuggestedPlaces] = useState<Place[]>([])
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([])
  const [showAddPlace, setShowAddPlace] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'suggestions' | 'saved'>('suggestions')
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid')
  const { addActivity } = useActivityTracker()
  const [newPlace, setNewPlace] = useState({
    name: '',
    address: '',
    category: 'restaurant',
    rating: 0,
    priceLevel: 2,
    notes: '',
    placeId: ''
  })

  useEffect(() => {
    if (tripData?.id) {
      loadSavedPlaces()
      if (tripData.destinationCity) {
        loadSuggestedPlaces()
      }
    }
  }, [tripData])

  const loadSavedPlaces = async () => {
    if (!tripData?.id) return
    
    try {
      const client = generateClient() as any
      const placesData = await client.models.Place.list({
        filter: { tripId: { eq: tripData.id } }
      })
      setSavedPlaces(placesData.data || [])
      setSavedPlaceIds((placesData.data || []).map((p: any) => p.placeId))
    } catch (error) {
      console.error('Error loading saved places:', error)
    }
  }

  const loadSuggestedPlaces = async () => {
    setLoading(true)
    try {
      const suggestions = generateMockPlaces(tripData.destinationCity)
      setSuggestedPlaces(suggestions)
    } catch (error) {
      console.error('Error loading suggested places:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSave = async (place: Place) => {
    try {
      const client = generateClient() as any
      
      if (savedPlaceIds.includes(place.id)) {
        // Unsave
        const existingPlace = savedPlaces.find(p => p.placeId === place.id)
        if (existingPlace) {
          await client.models.Place.delete({ id: existingPlace.id })
          setSavedPlaceIds(savedPlaceIds.filter(id => id !== place.id))
          await loadSavedPlaces()
          addActivity({
            type: 'delete',
            category: 'place',
            action: `Removed "${place.name}" from saved places`,
            details: { placeId: place.id }
          })
        }
      } else {
        // Save
        await client.models.Place.create({
          tripId: tripData.id,
          name: place.name,
          category: place.category,
          address: place.address,
          coordinates: JSON.stringify(place.coordinates || { lat: 0, lng: 0 }),
          rating: place.rating,
          priceLevel: place.priceLevel,
          placeId: place.id,
          notes: place.description
        })
        setSavedPlaceIds([...savedPlaceIds, place.id])
        await loadSavedPlaces()
        addActivity({
          type: 'create',
          category: 'place',
          action: `Saved "${place.name}" to places`,
          details: { placeId: place.id }
        })
      }
    } catch (error) {
      console.error('Error saving place:', error)
    }
  }

  const handleAddCustomPlace = async () => {
    if (!tripData?.id || !newPlace.name) return

    try {
      const client = generateClient() as any
      const placeData = {
        tripId: tripData.id,
        name: newPlace.name,
        address: newPlace.address,
        category: newPlace.category,
        rating: newPlace.rating,
        priceLevel: newPlace.priceLevel,
        notes: newPlace.notes,
        placeId: newPlace.placeId || `custom-${Date.now()}`,
        coordinates: JSON.stringify({ lat: 0, lng: 0 })
      }

      await client.models.Place.create(placeData)
      await loadSavedPlaces()
      setShowAddPlace(false)
      setNewPlace({
        name: '',
        address: '',
        category: 'restaurant',
        rating: 0,
        priceLevel: 2,
        notes: '',
        placeId: ''
      })
      addActivity({
        type: 'create',
        category: 'place',
        action: `Added custom place "${newPlace.name}"`,
        details: placeData
      })
    } catch (error) {
      console.error('Error saving place:', error)
    }
  }

  const handleDeleteSavedPlace = async (placeId: string) => {
    try {
      const client = generateClient() as any
      await client.models.Place.delete({ id: placeId })
      await loadSavedPlaces()
      addActivity({
        type: 'delete',
        category: 'place',
        action: 'Removed place from saved',
        details: { placeId }
      })
    } catch (error) {
      console.error('Error deleting place:', error)
    }
  }

  const openInGoogleMaps = (place: Place) => {
    const query = encodeURIComponent(`${place.name} ${place.address || tripData?.destinationCity || ''}`)
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`
    window.open(mapsUrl, '_blank')
  }

  const handleAddToItinerary = async (place: Place) => {
    if (!tripData?.id) return

    try {
      const client = generateClient() as any
      
      // Create an itinerary item from the place
      const itemData = {
        tripId: tripData.id,
        title: place.name,
        description: place.description || `Visit ${place.name}`,
        location: place.address || tripData.destinationCity,
        date: tripData.startDate || new Date().toISOString().split('T')[0],
        time: '10:00',
        category: place.category === 'restaurant' ? 'Restaurant' : 
                  place.category === 'cafe' ? 'Restaurant' :
                  place.category === 'nightlife' ? 'Event' :
                  place.category === 'hotel' ? 'Accommodation' :
                  place.category === 'shopping' ? 'Other' :
                  place.category === 'museum' ? 'Activity' :
                  place.category === 'park' ? 'Activity' :
                  place.category === 'attraction' ? 'Activity' : 'Other',
        price: place.priceLevel ? place.priceLevel * 25 : 0, // Rough estimate
        eventSource: 'Places',
        eventId: place.id,
        imageUrl: ''
      }

      await client.models.ItineraryItem.create(itemData)
      
      addActivity({
        type: 'create',
        category: 'trip',
        action: `Added ${place.name} to itinerary`,
        details: itemData
      })

      // Show success feedback
      alert(`✅ Added "${place.name}" to your itinerary!`)
    } catch (error) {
      console.error('Error adding to itinerary:', error)
      alert('Failed to add to itinerary. Please try again.')
    }
  }

  const filteredSuggestions = suggestedPlaces.filter(place => {
    const matchesCategory = selectedCategory === 'all' || place.category === selectedCategory
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (place.address?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
    return matchesCategory && matchesSearch
  })

  const filteredSaved = savedPlaces.filter(place => {
    const matchesCategory = selectedCategory === 'all' || place.category === selectedCategory
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (place.address?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
    return matchesCategory && matchesSearch
  })

  const renderPriceLevel = (level: number) => {
    return '💵'.repeat(level || 1)
  }

  const renderRating = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'text-yellow-500' : 'text-gray-300'}>
          ★
        </span>
      )
    }
    return stars
  }

  const placesToShow = viewMode === 'suggestions' ? filteredSuggestions : filteredSaved

  return (
    <div className="space-y-8">
      {/* Elegant Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 rounded-3xl opacity-95"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500 rounded-full filter blur-3xl opacity-20"></div>
        
        <div className="relative p-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-light text-white tracking-tight mb-2">Places to Explore</h1>
              <p className="text-white/70 font-light">Discover amazing locations in {tripData?.destinationCity}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="bg-white/10 backdrop-blur rounded-xl p-1 flex">
                <button
                  type="button"
                  onClick={() => setViewMode('suggestions')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'suggestions' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Suggestions
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('saved')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'saved' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Saved ({savedPlaces.length})
                </button>
              </div>

              {/* Display Mode Toggle */}
              <div className="bg-white/10 backdrop-blur rounded-xl p-1 flex">
                <button
                  type="button"
                  onClick={() => setDisplayMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    displayMode === 'grid' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Grid view"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    displayMode === 'list' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="List view"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              
              <button
                type="button"
                onClick={() => setShowAddPlace(true)}
                className="px-6 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-2xl hover:bg-white/20 transition-all flex items-center gap-3 group"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-white font-light">Add Custom</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-8 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places..."
              className="w-full px-6 py-4 bg-white/10 backdrop-blur border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:bg-white/20 transition-all"
            />
            <svg 
              className="absolute right-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-5 py-3 rounded-2xl transition-all whitespace-nowrap flex items-center gap-2 ${
              selectedCategory === cat.id
                ? 'bg-gradient-to-r text-white shadow-lg transform scale-105'
                : 'bg-white text-gray-700 hover:shadow-md'
            }`}
            style={{
              backgroundImage: selectedCategory === cat.id ? `linear-gradient(to right, var(--tw-gradient-stops))` : undefined,
              '--tw-gradient-from': selectedCategory === cat.id ? cat.color.split(' ')[1] : undefined,
              '--tw-gradient-to': selectedCategory === cat.id ? cat.color.split(' ')[3] : undefined,
            } as any}
          >
            <span className="text-lg">{cat.icon}</span>
            <span className="font-light">{cat.label}</span>
            {selectedCategory === cat.id && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {placesToShow.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Places Grid/List */}
      <div className={displayMode === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        : "space-y-4"
      }>
        {loading && viewMode === 'suggestions' ? (
          <div className="col-span-full text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading suggestions...</p>
          </div>
        ) : placesToShow.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-2">
              {viewMode === 'suggestions' 
                ? (searchQuery ? 'No places found' : 'No suggestions available')
                : 'No saved places yet'}
            </h3>
            <p className="text-gray-500 font-light mb-6">
              {viewMode === 'suggestions' 
                ? 'Try adjusting your search or filters'
                : 'Save places from suggestions to build your collection'}
            </p>
            {viewMode === 'saved' && (
              <button
                type="button"
                onClick={() => setViewMode('suggestions')}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all"
              >
                Browse Suggestions
              </button>
            )}
          </div>
        ) : (
          (viewMode === 'suggestions' ? filteredSuggestions : filteredSaved).map((place) => {
            const categoryInfo = categories.find(c => c.id === place.category) || categories[0]
            const isSaved = savedPlaceIds.includes(viewMode === 'suggestions' ? place.id : place.placeId)
            
            // List View Layout
            if (displayMode === 'list') {
              return (
                <div
                  key={viewMode === 'suggestions' ? place.id : place.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-4 group"
                >
                  <div className="flex items-center justify-between">
                    {/* Left side - Icon and Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryInfo.color} flex items-center justify-center text-white text-xl flex-shrink-0`}>
                        {categoryInfo.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">{place.name}</h3>
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{categoryInfo.label}</span>
                          {place.rating && place.rating > 0 && (
                            <div className="flex items-center gap-1">
                              {renderRating(place.rating)}
                              <span className="text-sm text-gray-500 ml-1">({place.rating})</span>
                            </div>
                          )}
                          {place.priceLevel !== undefined && place.priceLevel > 0 && (
                            <span className="text-sm">{renderPriceLevel(place.priceLevel)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          {place.address && (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {place.address}
                            </p>
                          )}
                          {place.distance && (
                            <span className="text-xs text-gray-500">{place.distance} km</span>
                          )}
                          {place.isOpen !== undefined && (
                            <span className={`text-xs flex items-center gap-1 ${place.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${place.isOpen ? 'bg-green-600' : 'bg-red-600'}`}></span>
                              {place.isOpen ? 'Open' : 'Closed'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side - Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        type="button"
                        onClick={() => openInGoogleMaps(place)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-all"
                        title="Open in Google Maps"
                      >
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleAddToItinerary(place)}
                        className="p-2 hover:bg-purple-50 rounded-lg transition-all"
                        title="Add to itinerary"
                      >
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      
                      {viewMode === 'suggestions' ? (
                        <button
                          type="button"
                          onClick={() => handleToggleSave(place)}
                          className={`p-2 rounded-lg transition-all ${
                            isSaved 
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                              : 'hover:bg-gray-100 text-gray-400'
                          }`}
                          title={isSaved ? 'Remove from saved' : 'Save place'}
                        >
                          <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedPlace(place.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-all"
                          title="Remove from saved"
                        >
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            }
            
            // Grid View Layout (existing)
            return (
              <div
                key={viewMode === 'suggestions' ? place.id : place.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all overflow-hidden group"
              >
                {/* Category Header */}
                <div 
                  className={`h-2 bg-gradient-to-r ${categoryInfo.color}`}
                />
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryInfo.color} flex items-center justify-center text-white text-xl`}>
                        {categoryInfo.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{place.name}</h3>
                        <p className="text-sm text-gray-500">{categoryInfo.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Google Maps button */}
                      <button
                        type="button"
                        onClick={() => openInGoogleMaps(place)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-all"
                        title="Open in Google Maps"
                      >
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      
                      {/* Add to Itinerary button */}
                      <button
                        type="button"
                        onClick={() => handleAddToItinerary(place)}
                        className="p-2 hover:bg-purple-50 rounded-lg transition-all"
                        title="Add to itinerary"
                      >
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      
                      {viewMode === 'suggestions' ? (
                        <button
                          type="button"
                          onClick={() => handleToggleSave(place)}
                          className={`p-2 rounded-lg transition-all ${
                            isSaved 
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                              : 'hover:bg-gray-100 text-gray-400'
                          }`}
                          title={isSaved ? 'Remove from saved' : 'Save place'}
                        >
                          <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedPlace(place.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                          title="Remove from saved"
                        >
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {place.address && (
                    <p className="text-sm text-gray-600 mb-3 flex items-start gap-2">
                      <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="line-clamp-2">{place.address}</span>
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    {place.rating && place.rating > 0 && (
                      <div className="flex items-center gap-1">
                        {renderRating(place.rating)}
                        <span className="text-sm text-gray-500 ml-1">({place.rating})</span>
                      </div>
                    )}
                    {place.priceLevel !== undefined && place.priceLevel > 0 && (
                      <span className="text-sm">{renderPriceLevel(place.priceLevel)}</span>
                    )}
                  </div>

                  {(place.description || place.notes) && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {place.description || place.notes}
                      </p>
                    </div>
                  )}

                  {viewMode === 'suggestions' && place.tags && place.tags.length > 0 && (
                    <div className="pt-3 flex flex-wrap gap-1">
                      {place.tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Bar at Bottom */}
                  <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {place.distance && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          {place.distance} km
                        </span>
                      )}
                      {place.isOpen !== undefined && (
                        <span className={`text-xs flex items-center gap-1 ${place.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${place.isOpen ? 'bg-green-600' : 'bg-red-600'}`}></span>
                          {place.isOpen ? 'Open' : 'Closed'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <span>Quick actions →</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Place Modal */}
      {showAddPlace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light text-gray-900">Add Custom Place</h2>
              <button
                type="button"
                onClick={() => setShowAddPlace(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Place Name *</label>
                <input
                  type="text"
                  value={newPlace.name}
                  onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Central Park"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-3">
                  {categories.slice(1).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewPlace({ ...newPlace, category: cat.id })}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                        newPlace.category === cat.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-xs">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Address</label>
                <input
                  type="text"
                  value={newPlace.address}
                  onChange={(e) => setNewPlace({ ...newPlace, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., 123 Main St, New York, NY"
                />
              </div>

              {/* Rating & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewPlace({ ...newPlace, rating: star })}
                        className={`text-2xl ${star <= newPlace.rating ? 'text-yellow-500' : 'text-gray-300'} hover:scale-110 transition-transform`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Price Level</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setNewPlace({ ...newPlace, priceLevel: level })}
                        className={`px-3 py-1 rounded-lg border-2 transition-all ${
                          level <= newPlace.priceLevel
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 text-gray-400'
                        }`}
                      >
                        💵
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Notes</label>
                <textarea
                  value={newPlace.notes}
                  onChange={(e) => setNewPlace({ ...newPlace, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleAddCustomPlace}
                  disabled={!newPlace.name}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  Save Place
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPlace(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}