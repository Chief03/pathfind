'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import ActivityFeed from './ActivityFeed'
import { useActivityTracker } from '@/contexts/ActivityTracker'

interface TripOverviewModernProps {
  tripData: any
  onTripUpdate?: (updatedTrip: any) => void
  flightCount?: number
  eventCount?: number
  placeCount?: number
  totalBudget?: number
}

export default function TripOverviewModern({ tripData, onTripUpdate, flightCount = 0, eventCount = 0, placeCount = 0, totalBudget = 0 }: TripOverviewModernProps) {
  const { addActivity } = useActivityTracker()
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [isProgressExpanded, setIsProgressExpanded] = useState(false)
  const [editValues, setEditValues] = useState({
    name: tripData?.name || '',
    destinationCity: tripData?.destinationCity || '',
    departureCity: tripData?.departureCity || '',
    startDate: tripData?.startDate || '',
    endDate: tripData?.endDate || '',
    groupSize: tripData?.groupSize || 2,
    description: tripData?.description || ''
  })

  useEffect(() => {
    setEditValues({
      name: tripData?.name || '',
      destinationCity: tripData?.destinationCity || '',
      departureCity: tripData?.departureCity || '',
      startDate: tripData?.startDate || '',
      endDate: tripData?.endDate || '',
      groupSize: tripData?.groupSize || 2,
      description: tripData?.description || ''
    })
  }, [tripData])

  const calculateNights = (start: string, end: string) => {
    if (!start || !end) return 0
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    })
  }

  const handleSave = async (field: string) => {
    try {
      const client = generateClient() as any
      const updateData: any = { id: tripData.id }
      
      if (field === 'dates') {
        updateData.startDate = editValues.startDate
        updateData.endDate = editValues.endDate
      } else if (field === 'destination') {
        // Clean up common typos before saving
        let cleanDestination = editValues.destinationCity
        if (cleanDestination.match(/^C+colorado$/i)) {
          cleanDestination = 'Colorado'
        }
        updateData.destinationCity = cleanDestination
        updateData.departureCity = editValues.departureCity
      } else {
        updateData[field] = editValues[field as keyof typeof editValues]
      }

      const { data: updatedTrip } = await client.models.Trip.update(updateData)
      
      // Track the activity
      addActivity({
        type: 'update',
        category: 'trip',
        action: `Updated trip ${field}`,
        details: updateData
      })
      
      if (onTripUpdate) {
        onTripUpdate(updatedTrip)
      }
      
      setIsEditing(null)
    } catch (error) {
      console.error('Error updating trip:', error)
    }
  }

  const handleCancel = () => {
    setEditValues({
      name: tripData?.name || '',
      destinationCity: tripData?.destinationCity || '',
      departureCity: tripData?.departureCity || '',
      startDate: tripData?.startDate || '',
      endDate: tripData?.endDate || '',
      groupSize: tripData?.groupSize || 2,
      description: tripData?.description || ''
    })
    setIsEditing(null)
  }

  // Calculate progress based on completed items
  const progressItems = [
    { id: 'destination', label: 'Set destination', completed: !!tripData?.destinationCity, points: 10 },
    { id: 'dates', label: 'Choose travel dates', completed: !!tripData?.startDate && !!tripData?.endDate, points: 10 },
    { id: 'group', label: 'Set group size', completed: (tripData?.groupSize || 0) > 0, points: 5 },
    { id: 'flight', label: `Add at least one flight (${flightCount} added)`, completed: flightCount > 0, points: 20 },
    { id: 'accommodation', label: 'Book accommodation', completed: false, points: 20 },
    { id: 'activities', label: `Plan 3+ activities (${eventCount} planned)`, completed: eventCount >= 3, points: 15 },
    { id: 'places', label: `Save 5+ places to visit (${placeCount} saved)`, completed: placeCount >= 5, points: 10 },
    { id: 'budget', label: `Set trip budget ($${totalBudget} allocated)`, completed: totalBudget > 0, points: 10 },
  ]

  const completedPoints = progressItems.filter(item => item.completed).reduce((acc, item) => acc + item.points, 0)
  const totalPoints = progressItems.reduce((acc, item) => acc + item.points, 0)
  const progressPercentage = Math.round((completedPoints / totalPoints) * 100)

  return (
    <div className="space-y-6">
      {/* Trip Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-600">Trip Planning Progress</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-purple-600">{progressPercentage}% Complete</span>
              <button
                onClick={() => setIsProgressExpanded(!isProgressExpanded)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform ${isProgressExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-red-500 to-purple-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* Expandable Checklist */}
        {isProgressExpanded && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Complete these steps to plan your perfect trip:</p>
              {progressItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.completed ? (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                    )}
                    <span className={`text-sm ${item.completed ? 'text-gray-700 line-through' : 'text-gray-600'}`}>
                      {item.label}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.completed 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    +{item.points}%
                  </span>
                </div>
              ))}
            </div>
            
            {progressPercentage < 100 && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800">
                  <span className="font-semibold">Next step:</span> {
                    progressItems.find(item => !item.completed)?.label || 'Complete all tasks'
                  }
                </p>
              </div>
            )}
            
            {progressPercentage === 100 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <span className="text-lg">🎉</span>
                  <span className="font-semibold">Awesome! Your trip is fully planned!</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trip Header Section */}
      <div className="bg-gradient-to-r from-purple-50 to-red-50 rounded-2xl p-6 border border-purple-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing === 'name' ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={editValues.name}
                  onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                  className="text-2xl font-bold bg-white px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Trip name"
                />
                <button
                  onClick={() => handleSave('name')}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {tripData?.name || 'Untitled Trip'}
                </h1>
                <button
                  onClick={() => setIsEditing('name')}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                {tripData?.shareCode}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(tripData?.shareCode || '')}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Share Trip
          </button>
        </div>
      </div>

      {/* Main Info Widgets - 2x2 Grid */}
      <div className="grid grid-cols-2 gap-5">
        {/* Destination Widget */}
        <div className="relative transform hover:scale-[1.02] transition-transform">
          {/* Gadget frame with 3D effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl transform translate-y-1"></div>
          <div className="relative bg-gradient-to-b from-gray-600 via-gray-700 to-gray-800 rounded-2xl p-1 shadow-2xl">
            {/* Inner bezel */}
            <div className="bg-gradient-to-b from-gray-800 to-black rounded-2xl p-0.5">
              {/* Screen area */}
              <div className="bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 rounded-xl p-4 shadow-inner">
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-xl pointer-events-none"></div>
                {/* LED indicator */}
                <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50 animate-pulse"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Destination</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing('destination')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
          {isEditing === 'destination' ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editValues.destinationCity}
                onChange={(e) => setEditValues({ ...editValues, destinationCity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Destination city"
              />
              <input
                type="text"
                value={editValues.departureCity}
                onChange={(e) => setEditValues({ ...editValues, departureCity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Departure city"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('destination')}
                  className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-lg font-bold text-gray-900">
                  {(() => {
                    const destination = tripData?.destinationCity || 'Not set'
                    // Fix common typos
                    if (destination.match(/^C+colorado$/i)) {
                      return 'Colorado'
                    }
                    return destination
                  })()}
                </span>
              </div>
              {tripData?.departureCity && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                  from {tripData?.departureCity}
                </p>
              )}
            </>
          )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dates Widget */}
        <div className="relative transform hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl transform translate-y-1"></div>
          <div className="relative bg-gradient-to-b from-gray-600 via-gray-700 to-gray-800 rounded-2xl p-1 shadow-2xl">
            <div className="bg-gradient-to-b from-gray-800 to-black rounded-2xl p-0.5">
              <div className="bg-gradient-to-br from-blue-900 to-cyan-900 rounded-xl p-4 shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-xl pointer-events-none"></div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50 animate-pulse"></div>
                <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Travel Dates</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing('dates')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
          {isEditing === 'dates' ? (
            <div className="space-y-3">
              <input
                type="date"
                value={editValues.startDate}
                onChange={(e) => setEditValues({ ...editValues, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={editValues.endDate}
                onChange={(e) => setEditValues({ ...editValues, endDate: e.target.value })}
                min={editValues.startDate}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('dates')}
                  className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(tripData?.startDate).split(',')[0]}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(tripData?.startDate).split(',').slice(1).join(',')}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-400 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(tripData?.endDate).split(',')[0]}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(tripData?.endDate).split(',').slice(1).join(',')}
                  </p>
                </div>
              </div>
              <p className="text-xs font-semibold text-purple-600 bg-purple-50 rounded-full px-3 py-1 inline-block mt-2">
                {calculateNights(tripData?.startDate, tripData?.endDate)} nights
              </p>
            </>
          )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Group Size Widget */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Group Size</h3>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={async () => {
                const newSize = Math.max(1, (tripData?.groupSize || 2) - 1)
                try {
                  const client = generateClient()
                  const { data: updatedTrip } = await (client as any).models.Trip.update({
                    id: tripData.id,
                    groupSize: newSize
                  })
                  if (updatedTrip) {
                    onTripUpdate(updatedTrip)
                    trackActivity({
                      type: 'update',
                      category: 'trip',
                      action: `Updated group size to ${newSize}`
                    })
                  }
                } catch (error) {
                  console.error('Error updating group size:', error)
                }
              }}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 min-w-[60px] text-center">
                {tripData?.groupSize || 2} {tripData?.groupSize === 1 ? 'person' : 'people'}
              </span>
            </div>
            
            <button
              type="button"
              onClick={async () => {
                const newSize = Math.min(20, (tripData?.groupSize || 2) + 1)
                try {
                  const client = generateClient()
                  const { data: updatedTrip } = await (client as any).models.Trip.update({
                    id: tripData.id,
                    groupSize: newSize
                  })
                  if (updatedTrip) {
                    onTripUpdate(updatedTrip)
                    trackActivity({
                      type: 'update',
                      category: 'trip',
                      action: `Updated group size to ${newSize}`
                    })
                  }
                } catch (error) {
                  console.error('Error updating group size:', error)
                }
              }}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Share Code Widget */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Share Code</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-mono font-bold text-purple-600 mb-1">{tripData?.shareCode}</p>
              <p className="text-[10px] text-gray-500">Share with friends</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(tripData?.shareCode || '')
                // You could add a toast notification here
              }}
              className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Activity Feed Widget */}
      <div className="mt-5">
        <ActivityFeed compact={true} maxItems={10} />
      </div>
    </div>
  )
}