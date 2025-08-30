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

interface ItineraryLuxeProps {
  tripData: any
}

// Sophisticated color palette with metallic accents
const categoryThemes: Record<string, { 
  gradient: string,
  accent: string,
  icon: string,
  glow: string,
  border: string
}> = {
  'Activity': { 
    gradient: 'from-blue-600/90 to-indigo-700/90',
    accent: 'bg-blue-500/10 border-blue-500/20',
    icon: '💎',
    glow: 'hover:shadow-blue-500/25',
    border: 'border-l-blue-500'
  },
  'Restaurant': { 
    gradient: 'from-rose-600/90 to-pink-700/90',
    accent: 'bg-rose-500/10 border-rose-500/20',
    icon: '🥂',
    glow: 'hover:shadow-rose-500/25',
    border: 'border-l-rose-500'
  },
  'Transportation': { 
    gradient: 'from-slate-600/90 to-gray-700/90',
    accent: 'bg-slate-500/10 border-slate-500/20',
    icon: '🚁',
    glow: 'hover:shadow-slate-500/25',
    border: 'border-l-slate-500'
  },
  'Event': { 
    gradient: 'from-violet-600/90 to-purple-700/90',
    accent: 'bg-violet-500/10 border-violet-500/20',
    icon: '🎭',
    glow: 'hover:shadow-violet-500/25',
    border: 'border-l-violet-500'
  },
  'Accommodation': { 
    gradient: 'from-emerald-600/90 to-teal-700/90',
    accent: 'bg-emerald-500/10 border-emerald-500/20',
    icon: '🏛️',
    glow: 'hover:shadow-emerald-500/25',
    border: 'border-l-emerald-500'
  },
  'Other': { 
    gradient: 'from-amber-600/90 to-orange-700/90',
    accent: 'bg-amber-500/10 border-amber-500/20',
    icon: '✨',
    glow: 'hover:shadow-amber-500/25',
    border: 'border-l-amber-500'
  }
}

export default function ItineraryLuxe({ tripData }: ItineraryLuxeProps) {
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [draggedItem, setDraggedItem] = useState<ItineraryItem | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('grid')
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

  const getFullDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDayNum = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.getDate()
  }

  const getMonth = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  }

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Luxe Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-light tracking-tight text-gray-900">
                Itinerary
              </h1>
              <p className="text-gray-500 mt-2 text-sm tracking-wide uppercase">
                {tripData?.destinationCity} • {tripDates.length} Days
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'timeline' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Timeline
                </button>
              </div>
              
              {/* Add Event Button */}
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-900 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Event
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Main Content Area */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                  <p className="text-gray-500 mt-4 text-sm uppercase tracking-wider">Loading Itinerary</p>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid gap-6" style={{ 
                gridTemplateColumns: `repeat(auto-fill, minmax(320px, 1fr))`
              }}>
                {tripDates.map((date, index) => {
                  const dayItems = getItemsForDate(date)
                  const isToday = new Date().toISOString().split('T')[0] === date
                  const isDragOver = dragOverDate === date
                  
                  return (
                    <div
                      key={date}
                      className={`
                        bg-white rounded-xl border transition-all
                        ${isDragOver ? 'border-gray-400 shadow-xl scale-[1.02]' : 'border-gray-200 shadow-sm hover:shadow-lg'}
                        ${isToday ? 'ring-2 ring-black ring-offset-2' : ''}
                      `}
                      onDragOver={(e) => handleDragOver(e, date)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, date)}
                    >
                      {/* Date Header */}
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-3xl font-light text-gray-900">
                              Day {index + 1}
                            </div>
                            <div className="text-sm text-gray-500 mt-1 uppercase tracking-wider">
                              {getDayName(date)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-light text-gray-900">
                              {getDayNum(date)}
                            </div>
                            <div className="text-xs text-gray-500 uppercase">
                              {getMonth(date)}
                            </div>
                          </div>
                        </div>
                        {isToday && (
                          <div className="mt-3">
                            <span className="inline-block bg-black text-white text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                              Today
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Events */}
                      <div className={`p-6 min-h-[280px] ${isDragOver ? 'bg-gray-50' : ''}`}>
                        {dayItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-gray-400">
                            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            <p className="text-sm uppercase tracking-wider">No Events</p>
                            <p className="text-xs mt-1">Add or drag events here</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {dayItems.map((item) => {
                              const theme = categoryThemes[item.category || 'Other']
                              
                              return (
                                <div
                                  key={item.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, item)}
                                  className={`
                                    group relative transition-all cursor-move
                                    ${draggedItem?.id === item.id ? 'opacity-30' : ''}
                                  `}
                                >
                                  {/* Luxe Event Card */}
                                  <div className={`
                                    relative bg-white rounded-lg border-l-4 overflow-hidden
                                    transition-all duration-300 
                                    ${theme.border} ${theme.glow}
                                    hover:shadow-lg hover:scale-[1.01]
                                  `}>
                                    {/* Time Strip */}
                                    {item.startTime && (
                                      <div className={`
                                        absolute top-0 right-0 px-3 py-1
                                        bg-gradient-to-r ${theme.gradient}
                                        text-white text-xs font-medium
                                        rounded-bl-lg
                                      `}>
                                        {formatTime(item.startTime)}
                                      </div>
                                    )}
                                    
                                    {/* Content */}
                                    <div className="p-4">
                                      <div className="flex gap-4">
                                        {/* Icon */}
                                        <div className={`
                                          flex-shrink-0 w-12 h-12 rounded-lg
                                          ${theme.accent} border
                                          flex items-center justify-center
                                        `}>
                                          <span className="text-xl">{theme.icon}</span>
                                        </div>
                                        
                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-medium text-gray-900 tracking-tight">
                                            {item.title}
                                          </h4>
                                          <p className="text-sm text-gray-500 mt-1">
                                            {item.location}
                                          </p>
                                          {item.price && (
                                            <p className="text-xs text-gray-400 mt-2 uppercase tracking-wider">
                                              ${item.price} per person
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Actions */}
                                      <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingItem(item)
                                          }}
                                          className="flex-1 text-xs uppercase tracking-wider bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded transition-colors"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteItem(item.id)
                                          }}
                                          className="flex-1 text-xs uppercase tracking-wider bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded transition-colors"
                                        >
                                          Remove
                                        </button>
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
            ) : (
              /* Timeline View */
              <div className="space-y-8">
                {tripDates.map((date, index) => {
                  const dayItems = getItemsForDate(date)
                  const isToday = new Date().toISOString().split('T')[0] === date
                  
                  return (
                    <div key={date} className="relative">
                      {/* Date Label */}
                      <div className={`
                        sticky top-4 z-10 mb-6
                        ${isToday ? 'text-black' : 'text-gray-600'}
                      `}>
                        <div className="flex items-center gap-4">
                          <div className={`
                            px-4 py-2 rounded-full text-sm font-medium uppercase tracking-wider
                            ${isToday ? 'bg-black text-white' : 'bg-white border border-gray-300'}
                          `}>
                            Day {index + 1}
                          </div>
                          <div className="text-sm uppercase tracking-wider">
                            {getFullDate(date)}
                          </div>
                          {isToday && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full uppercase">
                              Today
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Timeline Items */}
                      <div className="ml-8 space-y-4">
                        {dayItems.length === 0 ? (
                          <div className="text-gray-400 text-sm italic">No events scheduled</div>
                        ) : (
                          dayItems.map((item, itemIndex) => {
                            const theme = categoryThemes[item.category || 'Other']
                            
                            return (
                              <div key={item.id} className="relative pl-8">
                                {/* Timeline Line */}
                                {itemIndex < dayItems.length - 1 && (
                                  <div className="absolute left-3 top-8 bottom-0 w-px bg-gray-200"></div>
                                )}
                                
                                {/* Timeline Dot */}
                                <div className={`
                                  absolute left-0 top-3 w-6 h-6 rounded-full border-4 border-white
                                  bg-gradient-to-br ${theme.gradient}
                                `}></div>
                                
                                {/* Event Card */}
                                <div className={`
                                  bg-white rounded-lg border shadow-sm hover:shadow-lg transition-all
                                  ${theme.border} border-l-4
                                `}>
                                  <div className="p-6">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="text-lg font-medium text-gray-900">
                                          {item.title}
                                        </h4>
                                        <p className="text-gray-500 mt-1">
                                          {item.location}
                                        </p>
                                        {item.description && (
                                          <p className="text-gray-600 text-sm mt-3">
                                            {item.description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        {item.startTime && (
                                          <div className="text-sm font-medium text-gray-900">
                                            {formatTime(item.startTime)}
                                            {item.endTime && ` - ${formatTime(item.endTime)}`}
                                          </div>
                                        )}
                                        {item.price && (
                                          <div className="text-sm text-gray-500 mt-1">
                                            ${item.price}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Elegant Sidebar */}
          <div className="w-96">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-6">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">Suggestions</h3>
                <p className="text-sm text-gray-500 mt-1">Curated for {tripData?.destinationCity}</p>
              </div>
              <div className="p-6">
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