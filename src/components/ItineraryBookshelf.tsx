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

interface ItineraryBookshelfProps {
  tripData: any
}

// Enhanced book spine designs with richer colors and patterns
const bookDesigns: Record<string, { 
  spine: string, 
  pattern: string,
  label: string,
  icon: string,
  accent: string 
}> = {
  'Activity': { 
    spine: 'from-blue-700 via-blue-800 to-blue-900',
    pattern: 'bg-gradient-to-r from-blue-600/20 via-transparent to-blue-600/20',
    label: 'ACTIVITY',
    icon: '🎯',
    accent: 'border-t-2 border-b-2 border-blue-400/50'
  },
  'Restaurant': { 
    spine: 'from-red-800 via-red-900 to-red-950',
    pattern: 'bg-gradient-to-r from-orange-600/20 via-transparent to-orange-600/20',
    label: 'DINING',
    icon: '🍽️',
    accent: 'border-t-2 border-b-2 border-orange-400/50'
  },
  'Transportation': { 
    spine: 'from-gray-700 via-gray-800 to-gray-900',
    pattern: 'bg-gradient-to-r from-gray-600/20 via-transparent to-gray-600/20',
    label: 'TRANSPORT',
    icon: '🚗',
    accent: 'border-t-2 border-b-2 border-gray-400/50'
  },
  'Event': { 
    spine: 'from-purple-700 via-purple-800 to-purple-900',
    pattern: 'bg-gradient-to-r from-purple-600/20 via-transparent to-purple-600/20',
    label: 'EVENT',
    icon: '🎭',
    accent: 'border-t-2 border-b-2 border-purple-400/50'
  },
  'Accommodation': { 
    spine: 'from-emerald-700 via-emerald-800 to-emerald-900',
    pattern: 'bg-gradient-to-r from-emerald-600/20 via-transparent to-emerald-600/20',
    label: 'LODGING',
    icon: '🏨',
    accent: 'border-t-2 border-b-2 border-emerald-400/50'
  },
  'Other': { 
    spine: 'from-amber-700 via-amber-800 to-amber-900',
    pattern: 'bg-gradient-to-r from-amber-600/20 via-transparent to-amber-600/20',
    label: 'MISC',
    icon: '📌',
    accent: 'border-t-2 border-b-2 border-amber-400/50'
  }
}

export default function ItineraryBookshelf({ tripData }: ItineraryBookshelfProps) {
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [draggedItem, setDraggedItem] = useState<ItineraryItem | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [hoveredBook, setHoveredBook] = useState<string | null>(null)
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
    if (!confirm(`Remove "${item?.title}" from your library?`)) return
    
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
    // Add book-dragging class for visual effect
    e.currentTarget.classList.add('opacity-50', 'rotate-6')
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50', 'rotate-6')
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
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  const getDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-50 to-orange-50 p-4">
      {/* Library Header */}
      <div className="max-w-full mx-auto mb-8">
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white p-6 rounded-t-xl shadow-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-serif">The Itinerary Library</h1>
              <p className="text-amber-100 mt-2 italic">A collection of your journey's moments</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-amber-700 hover:bg-amber-600 px-6 py-3 rounded-lg flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg"
            >
              <span className="text-2xl">📖</span>
              <span className="font-semibold">Add to Collection</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto flex gap-6">
        {/* Main Bookshelf Area */}
        <div className="flex-1">
          {/* Bookcase Frame */}
          <div className="bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900 p-6 rounded-xl shadow-2xl">
            <div className="bg-gradient-to-br from-amber-100 via-amber-50 to-amber-100 rounded-lg p-6">
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-amber-800"></div>
                    <p className="text-amber-700 mt-4 font-serif">Organizing your collection...</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-8" style={{ 
                  gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
                  maxWidth: '100%'
                }}>
                  {tripDates.map((date, shelfIndex) => {
                    const dayItems = getItemsForDate(date)
                    const isToday = new Date().toISOString().split('T')[0] === date
                    const isDragOver = dragOverDate === date
                    
                    return (
                      <div key={date} className="relative">
                        {/* Shelf Label */}
                        <div className="mb-4">
                          <div className={`
                            text-center p-3 rounded-t-lg shadow-md
                            ${isToday 
                              ? 'bg-gradient-to-b from-purple-700 to-purple-800 text-white' 
                              : 'bg-gradient-to-b from-amber-700 to-amber-800 text-amber-100'
                            }
                          `}>
                            <div className="font-serif text-sm uppercase tracking-wider opacity-80">
                              {getDayName(date)}
                            </div>
                            <div className="text-xl font-bold">
                              {getDateDisplay(date)}
                            </div>
                            {isToday && (
                              <div className="mt-1">
                                <span className="inline-block bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                                  TODAY
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bookshelf */}
                        <div
                          className={`
                            relative transition-all duration-300
                            ${isDragOver ? 'transform scale-105' : ''}
                          `}
                          onDragOver={(e) => handleDragOver(e, date)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, date)}
                        >
                          {/* Shelf Back Panel */}
                          <div className="absolute inset-0 bg-gradient-to-b from-amber-800/30 to-amber-900/40 rounded-lg"></div>
                          
                          {/* Books Container */}
                          <div className={`
                            relative min-h-[420px] p-4 rounded-lg
                            ${isDragOver 
                              ? 'bg-purple-200/50 border-4 border-dashed border-purple-400' 
                              : 'bg-gradient-to-b from-amber-700/10 to-amber-800/20'
                            }
                          `}>
                            {dayItems.length === 0 ? (
                              <div className="flex items-center justify-center h-full min-h-[380px]">
                                <div className="text-center opacity-40">
                                  <div className="text-6xl mb-3">📚</div>
                                  <p className="text-amber-700 font-serif">Empty shelf</p>
                                  <p className="text-xs text-amber-600 mt-1">Drag books here</p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {dayItems.map((item, bookIndex) => {
                                  const design = bookDesigns[item.category || 'Other']
                                  const isHovered = hoveredBook === item.id
                                  
                                  return (
                                    <div
                                      key={item.id}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, item)}
                                      onDragEnd={handleDragEnd}
                                      onMouseEnter={() => setHoveredBook(item.id)}
                                      onMouseLeave={() => setHoveredBook(null)}
                                      className={`
                                        group relative cursor-move transition-all duration-300
                                        ${isHovered ? 'transform -translate-x-2 scale-105' : ''}
                                        ${draggedItem?.id === item.id ? 'opacity-30' : ''}
                                      `}
                                      style={{
                                        transform: `rotate(${bookIndex % 3 === 0 ? -0.5 : bookIndex % 3 === 1 ? 0 : 0.5}deg)`,
                                      }}
                                    >
                                      {/* Book Spine */}
                                      <div className={`
                                        relative overflow-hidden rounded-lg shadow-2xl
                                        bg-gradient-to-br ${design.spine}
                                        ${design.accent}
                                        transform transition-all duration-300
                                        ${isHovered ? 'shadow-3xl' : ''}
                                      `}>
                                        {/* Book Texture Overlay */}
                                        <div className={`absolute inset-0 ${design.pattern} opacity-30`}></div>
                                        
                                        {/* Gold Foil Decorations */}
                                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400/50 via-yellow-300 to-yellow-400/50"></div>
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400/50 via-yellow-300 to-yellow-400/50"></div>
                                        
                                        {/* Embossed Category Icon */}
                                        <div className="absolute top-2 right-2 text-2xl opacity-70">
                                          {design.icon}
                                        </div>
                                        
                                        {/* Book Content */}
                                        <div className="relative p-4 text-white">
                                          {/* Time Ribbon */}
                                          {item.startTime && (
                                            <div className="absolute -top-1 -left-1 bg-red-600 text-white text-xs px-3 py-1 rounded-br-lg shadow-lg">
                                              {formatTime(item.startTime)}
                                            </div>
                                          )}
                                          
                                          {/* Book Title - Vertical Text Style */}
                                          <div className="mt-6 mb-3">
                                            <h4 className="font-serif text-base font-bold leading-tight line-clamp-2 drop-shadow-lg">
                                              {item.title}
                                            </h4>
                                          </div>
                                          
                                          {/* Book Details */}
                                          <div className="space-y-1 text-xs opacity-90">
                                            <p className="flex items-center gap-1">
                                              <span>📍</span>
                                              <span className="line-clamp-1">{item.location}</span>
                                            </p>
                                            {item.price && (
                                              <p className="flex items-center gap-1">
                                                <span>💰</span>
                                                <span>${item.price}</span>
                                              </p>
                                            )}
                                          </div>
                                          
                                          {/* Category Label */}
                                          <div className="mt-3 pt-2 border-t border-white/20">
                                            <span className="inline-block bg-black/30 text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold">
                                              {design.label}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {/* Hover Actions */}
                                        <div className={`
                                          absolute bottom-2 right-2 flex gap-1 transition-all duration-300
                                          ${isHovered ? 'opacity-100' : 'opacity-0'}
                                        `}>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setEditingItem(item)
                                            }}
                                            className="bg-white/90 hover:bg-white text-gray-700 p-1.5 rounded-lg shadow-lg transition-all"
                                            title="Edit"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteItem(item.id)
                                            }}
                                            className="bg-white/90 hover:bg-white text-gray-700 p-1.5 rounded-lg shadow-lg transition-all"
                                            title="Remove"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Book Shadow */}
                                      <div className="absolute -bottom-1 left-2 right-2 h-2 bg-black/20 blur-md rounded-lg"></div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                          
                          {/* Wooden Shelf */}
                          <div className="relative mt-2">
                            <div className="h-4 bg-gradient-to-b from-amber-800 via-amber-900 to-amber-950 rounded-lg shadow-2xl"></div>
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-700/50 via-amber-600/30 to-amber-700/50"></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Suggestions Catalog */}
        <div className="w-80">
          <div className="bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900 p-1 rounded-xl shadow-2xl">
            <div className="bg-amber-50 rounded-lg p-4">
              <h3 className="font-serif text-xl text-amber-900 mb-4">Book Catalog</h3>
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