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
  startTime?: string
  endTime?: string
  category?: string
  tags?: string[]
  link?: string
  notes?: string
  participants?: string[]
  reminder?: boolean
  price?: number
  eventSource?: string
  eventId?: string
  eventUrl?: string
  imageUrl?: string
  addedBy?: string
  order?: number
}

interface ItineraryShelfProps {
  tripData: any
}

// Modern color palette for event cards
const categoryColors: Record<string, { 
  bg: string, 
  border: string,
  icon: string,
  glow: string
}> = {
  'Activity': { 
    bg: 'bg-blue-500',
    border: 'border-blue-400',
    icon: '🎯',
    glow: 'shadow-blue-500/30'
  },
  'Restaurant': { 
    bg: 'bg-red-500',
    border: 'border-red-400',
    icon: '🍽️',
    glow: 'shadow-red-500/30'
  },
  'Transportation': { 
    bg: 'bg-gray-600',
    border: 'border-gray-500',
    icon: '✈️',
    glow: 'shadow-gray-500/30'
  },
  'Event': { 
    bg: 'bg-purple-500',
    border: 'border-purple-400',
    icon: '🎭',
    glow: 'shadow-purple-500/30'
  },
  'Accommodation': { 
    bg: 'bg-green-500',
    border: 'border-green-400',
    icon: '🏨',
    glow: 'shadow-green-500/30'
  },
  'Other': { 
    bg: 'bg-indigo-500',
    border: 'border-indigo-400',
    icon: '📌',
    glow: 'shadow-indigo-500/30'
  }
}

export default function ItineraryShelf({ tripData }: ItineraryShelfProps) {
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [draggedItem, setDraggedItem] = useState<ItineraryItem | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const { trackActivity } = useActivityTracker()

  // Generate array of dates for the trip
  const getTripDates = () => {
    if (!tripData?.startDate || !tripData?.endDate) return []
    
    const dates = []
    const start = new Date(tripData.startDate)
    const end = new Date(tripData.endDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0])
    }
    
    return dates
  }

  const tripDates = getTripDates()

  useEffect(() => {
    if (tripData?.id) {
      fetchItineraryItems()
      fetchSuggestions()
    }
  }, [tripData])

  const fetchItineraryItems = async () => {
    try {
      const client = generateClient()
      const { data } = await (client as any).models.ItineraryItem.list({
        filter: { tripId: { eq: tripData.id } }
      })
      
      const sortedItems = data?.sort((a: any, b: any) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
        if (dateCompare !== 0) return dateCompare
        
        if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
        return 0
      }) || []
      
      setItems(sortedItems)
    } catch (error) {
      console.error('Error fetching itinerary:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    if (!tripData?.destinationCity || !tripData?.startDate || !tripData?.endDate) return
    
    setLoadingSuggestions(true)
    try {
      const { getEventSuggestions } = await import('@/lib/eventSuggestions')
      const suggestions = getEventSuggestions(tripData.destinationCity)
      setSuggestions(suggestions)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const generateSmartTime = (date: string, existingItems: ItineraryItem[]) => {
    const dayItems = existingItems.filter(item => item.date === date)
    
    if (dayItems.length === 0) {
      return { startTime: '09:00', endTime: '10:30' }
    }
    
    let latestEnd = '09:00'
    dayItems.forEach(item => {
      if (item.endTime && item.endTime > latestEnd) {
        latestEnd = item.endTime
      }
    })
    
    const [hours, minutes] = latestEnd.split(':').map(Number)
    const nextStart = new Date(2000, 0, 1, hours, minutes + 30)
    const nextEnd = new Date(2000, 0, 1, hours, minutes + 120)
    
    return {
      startTime: `${String(nextStart.getHours()).padStart(2, '0')}:${String(nextStart.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(nextEnd.getHours()).padStart(2, '0')}:${String(nextEnd.getMinutes()).padStart(2, '0')}`
    }
  }

  const handleAddItem = async (itemData: Partial<ItineraryItem>) => {
    try {
      const client = generateClient()
      
      if (!itemData.startTime && itemData.date) {
        const times = generateSmartTime(itemData.date, items)
        itemData.startTime = times.startTime
        itemData.endTime = times.endTime
      }
      
      const { data: newItem } = await (client as any).models.ItineraryItem.create({
        tripId: tripData.id,
        ...itemData
      })
      
      if (newItem) {
        setItems([...items, newItem])
        setShowAddForm(false)
        trackActivity({
          type: 'create',
          category: 'trip',
          action: `Added "${itemData.title}" to itinerary`
        })
      }
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const handleUpdateItem = async (itemId: string, updates: Partial<ItineraryItem>) => {
    try {
      const client = generateClient()
      const { data: updatedItem } = await (client as any).models.ItineraryItem.update({
        id: itemId,
        ...updates
      })
      
      if (updatedItem) {
        setItems(items.map(item => item.id === itemId ? updatedItem : item))
        setEditingItem(null)
        trackActivity({
          type: 'update',
          category: 'trip',
          action: `Updated "${updates.title || 'item'}" in itinerary`
        })
      }
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!confirm(`Remove "${item?.title}" from itinerary?`)) return
    
    try {
      const client = generateClient()
      await (client as any).models.ItineraryItem.delete({ id: itemId })
      
      setItems(items.filter(item => item.id !== itemId))
      trackActivity({
        type: 'delete',
        category: 'trip',
        action: `Removed "${item?.title}" from itinerary`
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

  const handleDragLeave = () => {
    setDragOverDate(null)
  }

  const handleDrop = async (e: React.DragEvent, date: string) => {
    e.preventDefault()
    setDragOverDate(null)
    
    if (!draggedItem || draggedItem.date === date) {
      setDraggedItem(null)
      return
    }
    
    await handleUpdateItem(draggedItem.id, { 
      date,
      ...generateSmartTime(date, items.filter(i => i.id !== draggedItem.id))
    })
    
    trackActivity({
      type: 'update',
      category: 'trip',
      action: `Moved "${draggedItem.title}" to ${new Date(date).toLocaleDateString()}`
    })
    
    setDraggedItem(null)
  }

  const formatTime = (time?: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes}${ampm}`
  }

  const getItemsForDate = (date: string) => {
    return items
      .filter(item => item.date === date)
      .sort((a, b) => {
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime)
        }
        return 0
      })
  }

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const getDateNum = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.getDate()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Modern Header */}
      <div className="max-w-full mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trip Itinerary</h1>
            <p className="text-gray-600 mt-1">Organize your journey day by day</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-semibold">Add Event</span>
          </button>
        </div>
      </div>

      <div className="max-w-full mx-auto flex gap-6">
        {/* Main Shelf Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="text-gray-600 mt-4">Loading your itinerary...</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4" style={{ 
              gridTemplateColumns: `repeat(auto-fill, minmax(280px, 1fr))`
            }}>
              {tripDates.map((date) => {
                const dayItems = getItemsForDate(date)
                const isToday = new Date().toISOString().split('T')[0] === date
                const isDragOver = dragOverDate === date
                
                return (
                  <div
                    key={date}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    onDragOver={(e) => handleDragOver(e, date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, date)}
                  >
                    {/* Day Header */}
                    <div className={`
                      p-4 rounded-t-xl border-b
                      ${isToday 
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' 
                        : 'bg-gray-50 text-gray-900 border-gray-200'
                      }
                    `}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{getDateNum(date)}</div>
                            <div className="text-xs uppercase opacity-75">{getDayName(date)}</div>
                          </div>
                          {isToday && (
                            <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="text-sm opacity-75">
                          {dayItems.length} event{dayItems.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* Events Container */}
                    <div className={`
                      p-4 min-h-[300px] transition-colors
                      ${isDragOver ? 'bg-purple-50' : 'bg-white'}
                    `}>
                      {dayItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-gray-400">
                          <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <p className="text-sm font-medium">No events scheduled</p>
                          <p className="text-xs mt-1">Drag events here or add new</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {dayItems.map((item) => {
                            const colors = categoryColors[item.category || 'Other']
                            const isExpanded = expandedCard === item.id
                            
                            return (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                onClick={() => setExpandedCard(isExpanded ? null : item.id)}
                                className={`
                                  group relative cursor-move transition-all duration-300
                                  ${draggedItem?.id === item.id ? 'opacity-40' : ''}
                                  ${isExpanded ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
                                `}
                              >
                                {/* Event Card */}
                                <div className={`
                                  relative overflow-hidden rounded-lg border-l-4 bg-white
                                  shadow-sm hover:shadow-lg transition-all
                                  ${colors.border} ${isExpanded ? `shadow-lg ${colors.glow}` : ''}
                                `}>
                                  {/* Time Badge */}
                                  {item.startTime && (
                                    <div className={`
                                      absolute top-2 right-2 text-xs font-medium px-2 py-1 rounded-full
                                      ${colors.bg} text-white
                                    `}>
                                      {formatTime(item.startTime)}
                                    </div>
                                  )}
                                  
                                  {/* Card Content */}
                                  <div className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div className={`
                                        flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                                        ${colors.bg} bg-opacity-10
                                      `}>
                                        <span className="text-lg">{colors.icon}</span>
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 truncate">
                                          {item.title}
                                        </h4>
                                        <p className="text-sm text-gray-600 mt-1 truncate">
                                          📍 {item.location}
                                        </p>
                                        
                                        {/* Expanded Details */}
                                        {isExpanded && (
                                          <div className="mt-3 space-y-2">
                                            {item.description && (
                                              <p className="text-sm text-gray-700">{item.description}</p>
                                            )}
                                            {item.endTime && (
                                              <p className="text-sm text-gray-600">
                                                Duration: {formatTime(item.startTime)} - {formatTime(item.endTime)}
                                              </p>
                                            )}
                                            {item.price && (
                                              <p className="text-sm text-gray-600">
                                                Cost: ${item.price}
                                              </p>
                                            )}
                                            {item.tags && item.tags.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {item.tags.map(tag => (
                                                  <span
                                                    key={tag}
                                                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                                                  >
                                                    {tag}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className={`
                                      flex gap-2 mt-3 transition-all
                                      ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                    `}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingItem(item)
                                        }}
                                        className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 px-3 rounded-lg transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteItem(item.id)
                                        }}
                                        className="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 py-1.5 px-3 rounded-lg transition-colors"
                                      >
                                        Remove
                                      </button>
                                      {item.eventUrl && (
                                        <a
                                          href={item.eventUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 py-1.5 px-3 rounded-lg transition-colors text-center"
                                        >
                                          Link
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Suggestions Sidebar */}
        <div className="w-80">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Suggestions</h3>
            <SuggestionsList
              tripData={tripData}
              suggestions={suggestions}
              loading={loadingSuggestions}
              onAddToItinerary={(item) => {
                const itemWithDate = {
                  ...item,
                  date: selectedDate || tripDates[0],
                  ...generateSmartTime(selectedDate || tripDates[0], items)
                }
                handleAddItem(itemWithDate)
              }}
              existingItems={items}
            />
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingItem) && (
        <CustomEventForm
          tripData={tripData}
          item={editingItem}
          onSave={(data) => {
            if (editingItem) {
              handleUpdateItem(editingItem.id, data)
            } else {
              handleAddItem(data)
            }
          }}
          onCancel={() => {
            setShowAddForm(false)
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}