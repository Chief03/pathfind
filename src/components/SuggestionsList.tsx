'use client'

import { useState, useEffect } from 'react'

interface SuggestionsListProps {
  tripData: any
  suggestions: any[]
  loading: boolean
  onAddToItinerary: (item: any) => void
  existingItems: any[]
}

export default function SuggestionsList({ 
  tripData, 
  suggestions, 
  loading, 
  onAddToItinerary,
  existingItems 
}: SuggestionsListProps) {
  const [activeCategory, setActiveCategory] = useState<'generic' | 'events'>('generic')
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([])
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    filterSuggestions()
  }, [suggestions, activeCategory])

  useEffect(() => {
    // Optionally fetch from API if tripData changes
    if (tripData?.destinationCity && tripData?.startDate && tripData?.endDate) {
      fetchFromAPI()
    }
  }, [tripData?.destinationCity, tripData?.startDate, tripData?.endDate])

  const fetchFromAPI = async () => {
    try {
      const response = await fetch(
        `/api/suggestions?city=${encodeURIComponent(tripData.destinationCity)}&start=${tripData.startDate}&end=${tripData.endDate}`
      )
      if (response.ok) {
        const apiSuggestions = await response.json()
        // Merge with existing suggestions or replace
        // For now, we'll just log them
        console.log('API suggestions:', apiSuggestions)
      }
    } catch (error) {
      console.error('Error fetching from API:', error)
    }
  }

  const filterSuggestions = () => {
    if (activeCategory === 'generic') {
      // Filter for generic activities (free, museums, parks, etc.)
      setFilteredSuggestions(
        suggestions.filter(s => 
          ['activity', 'outdoor', 'cultural', 'restaurant'].includes(s.category)
        )
      )
    } else {
      // Filter for dated events (concerts, shows, etc.)
      setFilteredSuggestions(
        suggestions.filter(s => 
          ['concert', 'nightlife', 'attraction'].includes(s.category) && s.requiresTicket
        )
      )
    }
  }

  const handleAddToItinerary = (suggestion: any) => {
    // Convert suggestion to itinerary item format
    const newItem = {
      title: suggestion.title,
      description: suggestion.description,
      location: suggestion.location || tripData.destinationCity,
      date: tripData.startDate, // Default to trip start, user can change
      category: mapCategoryToItinerary(suggestion.category),
      price: typeof suggestion.price === 'number' ? suggestion.price : undefined,
      eventSource: 'Suggested',
      eventId: suggestion.id,
      eventUrl: suggestion.bookingUrl,
      imageUrl: suggestion.image,
      tags: suggestion.tags || []
    }
    
    onAddToItinerary(newItem)
    setAddedItems(new Set([...addedItems, suggestion.id]))
  }

  const mapCategoryToItinerary = (category: string) => {
    const mapping: Record<string, string> = {
      'activity': 'Activity',
      'concert': 'Event',
      'restaurant': 'Restaurant',
      'attraction': 'Activity',
      'nightlife': 'Event',
      'outdoor': 'Activity',
      'cultural': 'Activity'
    }
    return mapping[category] || 'Other'
  }

  const isAlreadyAdded = (suggestionId: string) => {
    return addedItems.has(suggestionId) || 
           existingItems.some(item => item.eventId === suggestionId)
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'activity': '🎮',
      'concert': '🎵',
      'restaurant': '🍽️',
      'attraction': '🏛️',
      'nightlife': '🍹',
      'outdoor': '🏔️',
      'cultural': '🎨'
    }
    return icons[category] || '📍'
  }

  const formatPrice = (price: number | 'free' | undefined) => {
    if (price === 'free') return 'Free'
    if (typeof price === 'number') return `$${price}`
    return ''
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-xl font-semibold mb-4">Smart Suggestions</h3>
      
      {/* Category Tabs */}
      <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveCategory('generic')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeCategory === 'generic'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Things to Do
        </button>
        <button
          onClick={() => setActiveCategory('events')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeCategory === 'events'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Events & Shows
        </button>
      </div>

      {/* Destination Info */}
      <div className="mb-4 p-3 bg-purple-50 rounded-lg">
        <p className="text-sm text-purple-700">
          📍 Showing suggestions for <strong>{tripData?.destinationCity || 'your destination'}</strong>
        </p>
        {tripData?.startDate && tripData?.endDate && (
          <p className="text-xs text-purple-600 mt-1">
            📅 {new Date(tripData.startDate).toLocaleDateString()} - {new Date(tripData.endDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Suggestions List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-500 mt-2">Finding suggestions...</p>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No suggestions available</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(suggestion.category)}</span>
                    <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                  </div>
                  {suggestion.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm text-gray-600">{suggestion.rating}</span>
                    </div>
                  )}
                </div>
                {suggestion.price !== undefined && (
                  <span className={`text-sm font-medium ${
                    suggestion.price === 'free' ? 'text-green-600' : 'text-gray-700'
                  }`}>
                    {formatPrice(suggestion.price)}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {suggestion.description}
              </p>

              {suggestion.location && (
                <p className="text-xs text-gray-500 mb-2">
                  📍 {suggestion.location}
                </p>
              )}

              {suggestion.duration && (
                <p className="text-xs text-gray-500 mb-2">
                  ⏱️ {suggestion.duration}
                </p>
              )}

              {/* Tags */}
              {suggestion.tags && suggestion.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {suggestion.tags.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAddToItinerary(suggestion)}
                  disabled={isAlreadyAdded(suggestion.id)}
                  className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isAlreadyAdded(suggestion.id)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  {isAlreadyAdded(suggestion.id) ? '✓ Added' : '+ Add to Itinerary'}
                </button>
                {suggestion.bookingUrl && (
                  <a
                    href={suggestion.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    🎟️ Tickets
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Data Sources */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Powered by: Ticketmaster • Eventbrite • Yelp • Google Places
        </p>
      </div>
    </div>
  )
}