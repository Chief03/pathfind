'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import CustomEventForm from './CustomEventForm'
import SuggestionsList from './SuggestionsList'
import { useActivityTracker } from '@/contexts/ActivityTracker'

interface ItineraryItem {
  id: string
  tripId: string
  title: string
  description?: string
  location: string
  date: string
  time?: string
  category?: string
  price?: number
  eventSource?: string
  eventId?: string
  eventUrl?: string
  imageUrl?: string
  addedBy?: string
}

interface ItineraryLuxeRedesignedProps {
  tripData: any
}

const categoryConfig = [
  { id: 'Event', label: 'Events', icon: '🎭', color: 'from-purple-500 to-pink-600' },
  { id: 'Activity', label: 'Activities', icon: '🎯', color: 'from-blue-500 to-indigo-600' },
  { id: 'Restaurant', label: 'Dining', icon: '🍽️', color: 'from-orange-500 to-red-600' },
  { id: 'Transportation', label: 'Transport', icon: '✈️', color: 'from-slate-500 to-gray-600' },
  { id: 'Accommodation', label: 'Stays', icon: '🏨', color: 'from-teal-500 to-cyan-600' },
  { id: 'Other', label: 'Other', icon: '⭐', color: 'from-amber-500 to-yellow-600' }
]

export default function ItineraryLuxeRedesigned({ tripData }: ItineraryLuxeRedesignedProps) {
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const { addActivity } = useActivityTracker()

  useEffect(() => {
    if (tripData?.id) {
      loadItineraryItems()
      if (tripData.destinationCity && tripData.startDate && tripData.endDate) {
        loadSuggestions()
      }
    }
  }, [tripData])

  const loadItineraryItems = async () => {
    if (!tripData?.id) return
    setLoading(true)
    
    try {
      const client = generateClient() as any
      const { data } = await client.models.ItineraryItem.list({
        filter: { tripId: { eq: tripData.id } }
      })
      
      const sortedItems = (data || []).sort((a: any, b: any) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`)
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`)
        return dateA.getTime() - dateB.getTime()
      })
      
      setItems(sortedItems)
    } catch (error) {
      console.error('Error loading itinerary:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const response = await fetch(
        `/api/suggestions?city=${encodeURIComponent(tripData.destinationCity)}&start=${tripData.startDate}&end=${tripData.endDate}`
      )
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data)
      }
    } catch (error) {
      console.error('Error loading suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleAddToItinerary = async (suggestion: any) => {
    if (!tripData?.id) return

    try {
      const client = generateClient() as any
      const itemData = {
        tripId: tripData.id,
        title: suggestion.title,
        description: suggestion.description,
        location: suggestion.location || tripData.destinationCity,
        date: selectedDate || tripData.startDate,
        time: suggestion.startTime || '12:00',
        category: suggestion.category === 'restaurant' ? 'Restaurant' : 
                  suggestion.category === 'nightlife' ? 'Event' : 
                  suggestion.category === 'cultural' ? 'Activity' : 
                  suggestion.category === 'outdoor' ? 'Activity' : 'Other',
        price: typeof suggestion.price === 'number' ? suggestion.price : 0,
        eventSource: suggestion.source,
        eventId: suggestion.id,
        eventUrl: suggestion.bookingUrl,
        imageUrl: suggestion.image
      }

      await client.models.ItineraryItem.create(itemData)
      await loadItineraryItems()
      
      addActivity({
        type: 'create',
        category: 'itinerary',
        action: `Added ${suggestion.title} to itinerary`,
        details: itemData
      })
    } catch (error) {
      console.error('Error adding to itinerary:', error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      const client = generateClient() as any
      await client.models.ItineraryItem.delete({ id: itemId })
      await loadItineraryItems()
      
      addActivity({
        type: 'delete',
        category: 'itinerary',
        action: 'Removed item from itinerary',
        details: { itemId }
      })
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const getDatesArray = () => {
    if (!tripData?.startDate || !tripData?.endDate) return []
    const dates = []
    const start = new Date(tripData.startDate)
    const end = new Date(tripData.endDate)
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date).toISOString().split('T')[0])
    }
    return dates
  }

  const getItemsForDate = (date: string) => {
    return items.filter(item => item.date === date)
  }

  const formatDate = (dateStr: string, format: 'short' | 'long' = 'short') => {
    const date = new Date(dateStr + 'T00:00:00')
    if (format === 'short') {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric'
      })
    }
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const dates = getDatesArray()

  return (
    <div className="space-y-8">
      {/* Elegant Header - Using the purple gradient you love */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-3xl opacity-95"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500 rounded-full filter blur-3xl opacity-20"></div>
        
        <div className="relative p-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-light text-white tracking-tight mb-2">Trip Itinerary</h1>
              <p className="text-white/70 font-light">Plan your perfect journey</p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="bg-white/10 backdrop-blur rounded-xl p-1 flex">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'calendar' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  List
                </button>
              </div>
              
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-2xl hover:bg-white/20 transition-all flex items-center gap-3 group"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-white font-light">Add Event</span>
              </button>
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="grid grid-cols-6 gap-4 mt-8">
            {categoryConfig.map((cat) => {
              const count = items.filter(item => item.category === cat.id).length
              return (
                <div key={cat.id} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{cat.icon}</span>
                    <p className="text-2xl font-light text-white">{count}</p>
                  </div>
                  <p className="text-white/60 text-xs font-light">{cat.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'calendar' ? (
        <div className="space-y-6">
          {dates.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-2">No travel dates set</h3>
              <p className="text-gray-500 font-light">Set your travel dates to start planning</p>
            </div>
          ) : (
            dates.map((date) => {
              const dayItems = getItemsForDate(date)
              const isSelected = selectedDate === date
              
              return (
                <div key={date} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Date Header */}
                  <div 
                    className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 cursor-pointer hover:from-purple-100 hover:to-indigo-100 transition-all"
                    onClick={() => setSelectedDate(isSelected ? null : date)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-3xl font-light text-gray-900">
                            {new Date(date + 'T00:00:00').getDate()}
                          </p>
                          <p className="text-xs text-gray-500 uppercase">
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-light text-gray-900">
                            {formatDate(date, 'long').split(',').slice(0, -1).join(',')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {dayItems.length} {dayItems.length === 1 ? 'event' : 'events'} planned
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDate(date)
                          setShowAddForm(true)
                        }}
                        className="p-2 hover:bg-purple-100 rounded-xl transition-colors"
                      >
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Day's Events */}
                  {dayItems.length > 0 ? (
                    <div className="p-6 space-y-4">
                      {dayItems.map((item) => {
                        const category = categoryConfig.find(c => c.id === item.category) || categoryConfig[5]
                        
                        return (
                          <div
                            key={item.id}
                            className="group relative bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-all"
                          >
                            <div className="flex items-start gap-4">
                              {/* Time Badge */}
                              {item.time && (
                                <div className="flex-shrink-0 text-center">
                                  <div className="px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
                                    <p className="text-sm font-semibold text-gray-900">{formatTime(item.time)}</p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Icon */}
                              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-white text-xl flex-shrink-0`}>
                                {category.icon}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                                    {item.description && (
                                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        </svg>
                                        {item.location}
                                      </span>
                                      {item.price !== undefined && item.price > 0 && (
                                        <span className="flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          ${item.price}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Actions */}
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {item.eventUrl && (
                                      <a
                                        href={item.eventUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                      >
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </a>
                                    )}
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-gray-400 font-light mb-3">No events planned for this day</p>
                      <button
                        onClick={() => {
                          setSelectedDate(date)
                          setShowAddForm(true)
                        }}
                        className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                      >
                        Add your first event →
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-2">Your itinerary is empty</h3>
              <p className="text-gray-500 font-light mb-6">Start adding events to plan your trip</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all"
              >
                Add Your First Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const category = categoryConfig.find(c => c.id === item.category) || categoryConfig[5]
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center text-white`}>
                      {category.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(item.date)} {item.time && `at ${formatTime(item.time)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggested Activities</h3>
          <SuggestionsList
            tripData={tripData}
            suggestions={suggestions}
            loading={loadingSuggestions}
            onAddToItinerary={handleAddToItinerary}
            existingItems={items}
          />
        </div>
      )}

      {/* Add Event Modal */}
      {showAddForm && (
        <CustomEventForm
          tripData={tripData}
          onClose={() => setShowAddForm(false)}
          onSave={loadItineraryItems}
          selectedDate={selectedDate}
        />
      )}
    </div>
  )
}