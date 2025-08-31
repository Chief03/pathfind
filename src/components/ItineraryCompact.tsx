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

interface ItineraryCompactProps {
  tripData: any
}

const categoryConfig = [
  { id: 'Event', label: 'Events', icon: '🎭', color: 'from-purple-500 to-pink-600', bg: 'bg-purple-100', text: 'text-purple-700' },
  { id: 'Activity', label: 'Activities', icon: '🎯', color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-100', text: 'text-blue-700' },
  { id: 'Restaurant', label: 'Dining', icon: '🍽️', color: 'from-orange-500 to-red-600', bg: 'bg-orange-100', text: 'text-orange-700' },
  { id: 'Transportation', label: 'Transport', icon: '✈️', color: 'from-slate-500 to-gray-600', bg: 'bg-slate-100', text: 'text-slate-700' },
  { id: 'Accommodation', label: 'Stays', icon: '🏨', color: 'from-teal-500 to-cyan-600', bg: 'bg-teal-100', text: 'text-teal-700' },
  { id: 'Other', label: 'Other', icon: '⭐', color: 'from-amber-500 to-yellow-600', bg: 'bg-amber-100', text: 'text-amber-700' }
]

export default function ItineraryCompact({ tripData }: ItineraryCompactProps) {
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<ItineraryItem | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
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
        category: 'event',
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
        category: 'event',
        action: 'Removed item from itinerary',
        details: { itemId }
      })
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, item: ItineraryItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, date: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(date)
  }

  const handleDrop = async (e: React.DragEvent, newDate: string) => {
    e.preventDefault()
    setDragOverDate(null)
    
    if (!draggedItem || draggedItem.date === newDate) {
      setDraggedItem(null)
      return
    }

    try {
      const client = generateClient() as any
      await client.models.ItineraryItem.update({
        id: draggedItem.id,
        date: newDate
      })
      
      await loadItineraryItems()
      
      addActivity({
        type: 'update',
        category: 'event',
        action: `Moved ${draggedItem.title} to ${formatDate(newDate)}`,
        details: { itemId: draggedItem.id, newDate }
      })
    } catch (error) {
      console.error('Error moving item:', error)
    } finally {
      setDraggedItem(null)
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
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
  const totalEvents = items.length

  return (
    <div className="space-y-6">
      {/* Compact Header with Purple Gradient */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-2xl opacity-95"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl opacity-20"></div>
        
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-light text-white tracking-tight">Trip Itinerary</h1>
                <p className="text-white/60 text-sm font-light mt-1">
                  {totalEvents} {totalEvents === 1 ? 'event' : 'events'} planned • {dates.length} days
                </p>
              </div>
              
              {/* Compact Stats */}
              <div className="flex gap-3">
                {categoryConfig.map((cat) => {
                  const count = items.filter(item => item.category === cat.id).length
                  if (count === 0) return null
                  return (
                    <div key={cat.id} className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="text-white text-sm font-light">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-white/10 backdrop-blur border border-white/20 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-white text-sm font-light">Add Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* Side by Side Layout: Timeline and Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compact Timeline View - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
        {dates.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-light text-gray-900 mb-1">No travel dates set</h3>
            <p className="text-sm text-gray-500 font-light">Set your travel dates to start planning</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dates.map((date, index) => {
              const dayItems = getItemsForDate(date)
              const isExpanded = expandedDate === date
              const isDragOver = dragOverDate === date
              
              return (
                <div 
                  key={date}
                  className={`transition-all ${isDragOver ? 'bg-purple-50' : ''}`}
                  onDragOver={(e) => handleDragOver(e, date)}
                  onDrop={(e) => handleDrop(e, date)}
                  onDragLeave={() => setDragOverDate(null)}
                >
                  {/* Compact Date Header */}
                  <div 
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedDate(isExpanded ? null : date)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Day Number */}
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <span className="text-lg font-semibold text-purple-700">
                              {new Date(date + 'T00:00:00').getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(date)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Day {index + 1}
                            </p>
                          </div>
                        </div>

                        {/* Compact Event Pills */}
                        {!isExpanded && dayItems.length > 0 && (
                          <div className="flex items-center gap-2">
                            {dayItems.slice(0, 3).map((item) => {
                              const category = categoryConfig.find(c => c.id === item.category) || categoryConfig[5]
                              return (
                                <div
                                  key={item.id}
                                  className={`${category.bg} ${category.text} px-2 py-0.5 rounded-full text-xs flex items-center gap-1`}
                                >
                                  <span>{category.icon}</span>
                                  <span className="max-w-[100px] truncate">{item.title}</span>
                                </div>
                              )
                            })}
                            {dayItems.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{dayItems.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {dayItems.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {dayItems.length} {dayItems.length === 1 ? 'event' : 'events'}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDate(date)
                            setShowAddForm(true)
                          }}
                          className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <svg 
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Events (Compact Cards) */}
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-2">
                      {dayItems.length === 0 ? (
                        <div className="py-4 text-center bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">No events planned</p>
                          <button
                            onClick={() => {
                              setSelectedDate(date)
                              setShowAddForm(true)
                            }}
                            className="text-xs text-purple-600 hover:text-purple-700 font-medium mt-1"
                          >
                            Add your first event →
                          </button>
                        </div>
                      ) : (
                        dayItems.map((item) => {
                          const category = categoryConfig.find(c => c.id === item.category) || categoryConfig[5]
                          
                          return (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, item)}
                              className="group bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all cursor-move"
                            >
                              <div className="flex items-start gap-3">
                                {/* Time */}
                                {item.time && (
                                  <div className="flex-shrink-0">
                                    <p className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                      {formatTime(item.time)}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Icon */}
                                <div className={`w-8 h-8 rounded-lg ${category.bg} flex items-center justify-center flex-shrink-0`}>
                                  <span className="text-sm">{category.icon}</span>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="text-sm font-medium text-gray-900 truncate">{item.title}</h4>
                                      {item.description && (
                                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
                                      )}
                                      <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          </svg>
                                          {item.location}
                                        </span>
                                        {item.price !== undefined && item.price > 0 && (
                                          <span className="text-xs text-gray-500">${item.price}</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                      {item.eventUrl && (
                                        <a
                                          href={item.eventUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                        </a>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteItem(item.id)
                                        }}
                                        className="p-1 hover:bg-red-50 rounded transition-colors"
                                      >
                                        <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        </div>

        {/* Compact Suggestions Section - Takes 1 column on large screens */}
        {suggestions.length > 0 && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Add Suggestions</h3>
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                <SuggestionsList
                  tripData={tripData}
                  suggestions={suggestions}
                  loading={loadingSuggestions}
                  onAddToItinerary={handleAddToItinerary}
                  existingItems={items}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddForm && (
        <CustomEventForm
          tripData={tripData}
          onCancel={() => setShowAddForm(false)}
          onSave={loadItineraryItems}
        />
      )}
    </div>
  )
}