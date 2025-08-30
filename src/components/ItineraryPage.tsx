'use client'

import { useState, useEffect, useCallback } from 'react'
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

interface ItineraryPageProps {
  tripData: any
}

export default function ItineraryPage({ tripData }: ItineraryPageProps) {
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null)
  const [activeView, setActiveView] = useState<'all' | 'today' | 'saved'>('all')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [draggedItem, setDraggedItem] = useState<ItineraryItem | null>(null)
  const { trackActivity } = useActivityTracker()

  // Fetch itinerary items
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
        // Sort by date first, then by order/time
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
        if (dateCompare !== 0) return dateCompare
        
        if (a.order && b.order) return a.order - b.order
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
      // In production, this would call your backend API
      // For now, we'll use mock data from the eventSuggestions lib
      const { getEventSuggestions } = await import('@/lib/eventSuggestions')
      const suggestions = getEventSuggestions(tripData.destinationCity)
      setSuggestions(suggestions)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleAddItem = async (itemData: Partial<ItineraryItem>) => {
    try {
      const client = generateClient()
      const { data: newItem } = await (client as any).models.ItineraryItem.create({
        tripId: tripData.id,
        ...itemData,
        order: items.length + 1
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
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      const client = generateClient()
      await (client as any).models.ItineraryItem.delete({ id: itemId })
      
      const itemTitle = items.find(i => i.id === itemId)?.title
      setItems(items.filter(item => item.id !== itemId))
      trackActivity({
        type: 'delete',
        category: 'trip',
        action: `Removed "${itemTitle}" from itinerary`
      })
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleDragStart = (item: ItineraryItem) => {
    setDraggedItem(item)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetItem: ItineraryItem) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === targetItem.id) return

    const newItems = [...items]
    const draggedIndex = newItems.findIndex(i => i.id === draggedItem.id)
    const targetIndex = newItems.findIndex(i => i.id === targetItem.id)
    
    // Remove dragged item and insert at target position
    newItems.splice(draggedIndex, 1)
    newItems.splice(targetIndex, 0, draggedItem)
    
    // Update order values
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order: index + 1
    }))
    
    setItems(updatedItems)
    setDraggedItem(null)
    
    // Update order in database
    try {
      const client = generateClient()
      await Promise.all(
        updatedItems.map(item =>
          (client as any).models.ItineraryItem.update({
            id: item.id,
            order: item.order
          })
        )
      )
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const checkTimeConflict = (newItem: ItineraryItem) => {
    if (!newItem.startTime || !newItem.endTime) return false
    
    return items.some(item => {
      if (item.id === newItem.id || item.date !== newItem.date) return false
      if (!item.startTime || !item.endTime) return false
      
      const newStart = new Date(`${newItem.date}T${newItem.startTime}`)
      const newEnd = new Date(`${newItem.date}T${newItem.endTime}`)
      const itemStart = new Date(`${item.date}T${item.startTime}`)
      const itemEnd = new Date(`${item.date}T${item.endTime}`)
      
      return (newStart < itemEnd && newEnd > itemStart)
    })
  }

  const getFilteredItems = () => {
    const today = new Date().toISOString().split('T')[0]
    
    switch (activeView) {
      case 'today':
        return items.filter(item => item.date === today)
      case 'saved':
        return items.filter(item => !item.eventSource)
      default:
        return items
    }
  }

  const formatTime = (time?: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const filteredItems = getFilteredItems()

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Itinerary</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          + Add Custom Event
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['all', 'today', 'saved'] as const).map(view => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeView === view
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Itinerary List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold mb-4">
              {activeView === 'today' ? "Today's Schedule" : 'Your Itinerary'}
            </h3>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  {activeView === 'today' 
                    ? 'No events scheduled for today'
                    : 'No items in your itinerary yet'}
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Add your first event →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item)}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-move ${
                      checkTimeConflict(item) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">{item.title}</h4>
                          {item.eventSource && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {item.eventSource}
                            </span>
                          )}
                        </div>
                        
                        {item.description && (
                          <p className="text-gray-600 mb-2">{item.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span>📍 {item.location}</span>
                          <span>📅 {new Date(item.date).toLocaleDateString()}</span>
                          {item.startTime && (
                            <span>
                              🕐 {formatTime(item.startTime)}
                              {item.endTime && ` - ${formatTime(item.endTime)}`}
                            </span>
                          )}
                          {item.price && (
                            <span>💰 ${item.price}</span>
                          )}
                        </div>
                        
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.tags.map(tag => (
                              <span
                                key={tag}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {checkTimeConflict(item) && (
                          <p className="text-red-600 text-sm mt-2">
                            ⚠️ Time conflict with another event
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        {item.eventUrl && (
                          <a
                            href={item.eventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                            title="View tickets"
                          >
                            🎟️
                          </a>
                        )}
                        <button
                          onClick={() => setEditingItem(item)}
                          className="text-gray-600 hover:text-purple-600"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-gray-600 hover:text-red-600"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Smart Suggestions */}
        <div className="lg:col-span-1">
          <SuggestionsList
            tripData={tripData}
            suggestions={suggestions}
            loading={loadingSuggestions}
            onAddToItinerary={handleAddItem}
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