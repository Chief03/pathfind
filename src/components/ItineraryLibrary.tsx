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

interface ItineraryLibraryProps {
  tripData: any
}

// Color palette for book spines based on category - rich, library book colors
const bookColors: Record<string, { spine: string, accent: string, text: string }> = {
  'Activity': { spine: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900', accent: 'bg-blue-600', text: 'text-white' },
  'Restaurant': { spine: 'bg-gradient-to-br from-red-700 via-red-800 to-red-950', accent: 'bg-red-700', text: 'text-white' },
  'Transportation': { spine: 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900', accent: 'bg-slate-700', text: 'text-white' },
  'Event': { spine: 'bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900', accent: 'bg-purple-600', text: 'text-white' },
  'Accommodation': { spine: 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950', accent: 'bg-emerald-700', text: 'text-white' },
  'Other': { spine: 'bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950', accent: 'bg-amber-700', text: 'text-white' }
}

export default function ItineraryLibrary({ tripData }: ItineraryLibraryProps) {
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [draggedItem, setDraggedItem] = useState<ItineraryItem | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
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
    // Get items for this date
    const dayItems = existingItems.filter(item => item.date === date)
    
    if (dayItems.length === 0) {
      // First event of the day - start at 9 AM
      return { startTime: '09:00', endTime: '10:30' }
    }
    
    // Find the latest end time
    let latestEnd = '09:00'
    dayItems.forEach(item => {
      if (item.endTime && item.endTime > latestEnd) {
        latestEnd = item.endTime
      }
    })
    
    // Add 30 minutes buffer after the last event
    const [hours, minutes] = latestEnd.split(':').map(Number)
    const nextStart = new Date(2000, 0, 1, hours, minutes + 30)
    const nextEnd = new Date(2000, 0, 1, hours, minutes + 120) // 1.5 hour default duration
    
    return {
      startTime: `${String(nextStart.getHours()).padStart(2, '0')}:${String(nextStart.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(nextEnd.getHours()).padStart(2, '0')}:${String(nextEnd.getMinutes()).padStart(2, '0')}`
    }
  }

  const handleAddItem = async (itemData: Partial<ItineraryItem>) => {
    try {
      const client = generateClient()
      
      // Generate smart times if not provided
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
    if (!confirm(`Remove "${item?.title}" from your itinerary?`)) return
    
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
    
    // Update the item's date
    await handleUpdateItem(draggedItem.id, { 
      date,
      // Regenerate times for the new date
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
    return `${displayHour}:${minutes} ${ampm}`
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

  const getDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="max-w-full mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Itinerary Library</h2>
          <p className="text-gray-600 mt-1">Organize your trip like books on a shelf</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <span>📚</span> Add Event
        </button>
      </div>

      <div className="flex gap-6">
        {/* Library Shelves */}
        <div className="flex-1 bg-gradient-to-b from-amber-50 to-amber-100 rounded-xl p-6 shadow-lg">
          {/* Bookshelf Header */}
          <div className="mb-6 pb-4 border-b-4 border-amber-900/20">
            <h3 className="text-xl font-bold text-amber-900">Your Trip Library</h3>
            <p className="text-sm text-amber-700 mt-1">Drag events between days to reorganize</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-auto gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(tripDates.length, 7)}, minmax(200px, 1fr))` }}>
              {tripDates.map((date) => {
                const dayItems = getItemsForDate(date)
                const isToday = new Date().toISOString().split('T')[0] === date
                const isDragOver = dragOverDate === date
                
                return (
                  <div
                    key={date}
                    className={`transition-all ${isDragOver ? 'scale-105' : ''}`}
                    onDragOver={(e) => handleDragOver(e, date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, date)}
                  >
                    {/* Day Header */}
                    <div className={`text-center mb-4 p-3 rounded-lg ${
                      isToday ? 'bg-purple-200 shadow-md' : 'bg-amber-200'
                    }`}>
                      <div className="font-bold text-lg">{getDayName(date)}</div>
                      <div className="text-sm text-gray-700">{getDateDisplay(date)}</div>
                      {isToday && <div className="text-xs text-purple-700 mt-1">TODAY</div>}
                    </div>

                    {/* Bookshelf for this day */}
                    <div className="relative">
                      {/* Shelf background */}
                      <div className="absolute inset-0 bg-gradient-to-b from-amber-800/10 to-amber-900/20 rounded-lg"></div>
                      
                      {/* Books/Events */}
                      <div className={`relative min-h-[400px] p-4 space-y-3 rounded-lg border-4 border-amber-900/20 ${
                        isDragOver ? 'bg-purple-100/50 border-purple-400' : 'bg-gradient-to-b from-amber-100/50 to-amber-200/50'
                      }`}>
                        {dayItems.length === 0 ? (
                          <div className="flex items-center justify-center h-full min-h-[350px]">
                            <div className="text-center">
                              <div className="text-4xl mb-2 opacity-20">📚</div>
                              <p className="text-sm text-gray-500">Empty shelf</p>
                              <p className="text-xs text-gray-400 mt-1">Drag events here</p>
                            </div>
                          </div>
                        ) : (
                          dayItems.map((item, index) => {
                            const colors = bookColors[item.category || 'Other']
                            
                            return (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                className={`group relative cursor-move transform transition-all hover:scale-105 hover:rotate-1 ${
                                  draggedItem?.id === item.id ? 'opacity-50' : ''
                                }`}
                                style={{
                                  transform: `rotate(${index % 2 === 0 ? -1 : 1}deg)`
                                }}
                              >
                                {/* Book spine design */}
                                <div className={`${colors.spine} ${colors.text} rounded-lg shadow-xl p-4 relative overflow-hidden`}>
                                  {/* Book texture */}
                                  <div className="absolute inset-0 opacity-10">
                                    <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent"></div>
                                  </div>
                                  
                                  {/* Gold foil accent */}
                                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 opacity-70"></div>
                                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 opacity-70"></div>
                                  
                                  {/* Content */}
                                  <div className="relative">
                                    {/* Time badge */}
                                    {item.startTime && (
                                      <div className="absolute -top-2 -right-2 bg-white text-gray-800 text-xs px-2 py-1 rounded-full shadow-md">
                                        {formatTime(item.startTime)}
                                      </div>
                                    )}
                                    
                                    {/* Title on spine */}
                                    <h4 className="font-bold text-sm mb-1 line-clamp-2">{item.title}</h4>
                                    
                                    {/* Location */}
                                    <p className="text-xs opacity-90 line-clamp-1">📍 {item.location}</p>
                                    
                                    {/* Price */}
                                    {item.price && (
                                      <p className="text-xs opacity-90 mt-1">💰 ${item.price}</p>
                                    )}
                                    
                                    {/* Category label */}
                                    <div className="mt-2">
                                      <span className="inline-block bg-black/20 text-xs px-2 py-0.5 rounded">
                                        {item.category}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Action buttons (visible on hover) */}
                                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingItem(item)
                                      }}
                                      className="bg-white/90 text-gray-700 p-1.5 rounded hover:bg-white transition-colors"
                                      title="Edit"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteItem(item.id)
                                      }}
                                      className="bg-white/90 text-gray-700 p-1.5 rounded hover:bg-white transition-colors"
                                      title="Remove"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                      
                      {/* Shelf ledge */}
                      <div className="h-3 bg-gradient-to-b from-amber-800 to-amber-900 rounded-b-lg shadow-lg"></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Suggestions Sidebar */}
        <div className="w-80">
          <SuggestionsList
            tripData={tripData}
            suggestions={suggestions}
            loading={loadingSuggestions}
            onAddToItinerary={(item) => {
              // Add date to the item (default to first day or selected day)
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