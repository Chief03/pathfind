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
  isSaved?: boolean
  placeId?: string
  tags?: string[]
  distance?: number
}

interface PlacesDiscoveryLuxeProps {
  tripData: any
}

export default function PlacesDiscoveryLuxe({ tripData }: PlacesDiscoveryLuxeProps) {
  const [savedPlaces, setSavedPlaces] = useState<any[]>([])
  const [suggestedPlaces, setSuggestedPlaces] = useState<Place[]>([])
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([])
  const [showAddPlace, setShowAddPlace] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
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
      // Generate suggestions based on destination
      const suggestions = generateMockPlaces(tripData.destinationCity)
      setSuggestedPlaces(suggestions)
    } catch (error) {
      console.error('Error loading suggested places:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePlace = async (place: Place) => {
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

  const handleSavePlace = async () => {
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
      await loadPlaces()
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
    } catch (error) {
      console.error('Error saving place:', error)
    }
  }

  const handleDeletePlace = async (placeId: string) => {
    try {
      const client = generateClient() as any
      await client.models.Place.delete({ id: placeId })
      await loadPlaces()
    } catch (error) {
      console.error('Error deleting place:', error)
    }
  }

  const filteredPlaces = places.filter(place => {
    const matchesCategory = selectedCategory === 'all' || place.category === selectedCategory
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          place.address?.toLowerCase().includes(searchQuery.toLowerCase())
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
              <p className="text-white/70 font-light">Discover and save amazing locations</p>
            </div>
            <button
              onClick={() => setShowAddPlace(true)}
              className="px-6 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-2xl hover:bg-white/20 transition-all flex items-center gap-3 group"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-white font-light">Add Place</span>
            </button>
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
                {filteredPlaces.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Places Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlaces.length === 0 ? (
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
              {searchQuery ? 'No places found' : 'No places saved yet'}
            </h3>
            <p className="text-gray-500 font-light mb-6">
              {searchQuery ? 'Try a different search' : 'Start exploring and save your favorite spots'}
            </p>
            <button
              onClick={() => setShowAddPlace(true)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all"
            >
              Add Your First Place
            </button>
          </div>
        ) : (
          filteredPlaces.map((place) => {
            const categoryInfo = categories.find(c => c.id === place.category) || categories[0]
            
            return (
              <div
                key={place.id}
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
                        <p className="text-sm text-gray-500">{place.category}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePlace(place.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
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
                    {place.rating > 0 && (
                      <div className="flex items-center gap-1">
                        {renderRating(place.rating)}
                        <span className="text-sm text-gray-500 ml-1">({place.rating})</span>
                      </div>
                    )}
                    {place.priceLevel > 0 && (
                      <span className="text-sm">{renderPriceLevel(place.priceLevel)}</span>
                    )}
                  </div>

                  {place.notes && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600 line-clamp-2">{place.notes}</p>
                    </div>
                  )}
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
              <h2 className="text-2xl font-light text-gray-900">Add New Place</h2>
              <button
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
                  onClick={handleSavePlace}
                  disabled={!newPlace.name}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  Save Place
                </button>
                <button
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