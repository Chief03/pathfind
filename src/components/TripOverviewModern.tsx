'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import ActivityFeed from './ActivityFeed'
import { useActivityTracker } from '@/contexts/ActivityTracker'

interface TripOverviewModernProps {
  tripData: any
  onTripUpdate?: (updatedTrip: any) => void
  onTabChange?: (tab: string) => void
  flightCount?: number
  eventCount?: number
  placeCount?: number
  totalBudget?: number
}

export default function TripOverviewModern({ tripData, onTripUpdate, onTabChange, flightCount = 0, eventCount = 0, placeCount = 0, totalBudget = 0 }: TripOverviewModernProps) {
  const { addActivity } = useActivityTracker()
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [isProgressExpanded, setIsProgressExpanded] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
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
      
      addActivity({
        type: 'update',
        category: 'trip',
        action: `Updated trip ${field}`,
        details: updateData
      })
      
      if (onTripUpdate) {
        onTripUpdate?.(updatedTrip)
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
    { id: 'destination', label: 'Set destination', completed: !!tripData?.destinationCity, points: 10, icon: '📍' },
    { id: 'dates', label: 'Choose travel dates', completed: !!tripData?.startDate && !!tripData?.endDate, points: 10, icon: '📅' },
    { id: 'group', label: 'Set group size', completed: (tripData?.groupSize || 0) > 0, points: 5, icon: '👥' },
    { id: 'flight', label: `Add flights (${flightCount})`, completed: flightCount > 0, points: 20, icon: '✈️' },
    { id: 'accommodation', label: 'Book accommodation', completed: false, points: 20, icon: '🏨' },
    { id: 'activities', label: `Plan activities (${eventCount})`, completed: eventCount >= 3, points: 15, icon: '🎯' },
    { id: 'places', label: `Save places (${placeCount})`, completed: placeCount >= 5, points: 10, icon: '📍' },
    { id: 'budget', label: `Set budget ($${totalBudget})`, completed: totalBudget > 0, points: 10, icon: '💰' },
  ]

  const completedPoints = progressItems.filter(item => item.completed).reduce((acc, item) => acc + item.points, 0)
  const totalPoints = progressItems.reduce((acc, item) => acc + item.points, 0)
  const progressPercentage = Math.round((completedPoints / totalPoints) * 100)

  const quickStats = [
    { label: 'Days', value: calculateNights(tripData?.startDate, tripData?.endDate), icon: '📅', color: 'from-blue-500 to-blue-600' },
    { label: 'People', value: tripData?.groupSize || 0, icon: '👥', color: 'from-purple-500 to-purple-600' },
    { label: 'Flights', value: flightCount, icon: '✈️', color: 'from-green-500 to-green-600' },
    { label: 'Budget', value: `$${totalBudget}`, icon: '💰', color: 'from-yellow-500 to-yellow-600' },
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section with Trip Name and Share Code */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              {isEditing === 'name' ? (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editValues.name}
                    onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                    className="text-4xl font-bold bg-white/20 backdrop-blur px-4 py-2 rounded-xl border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="Trip name"
                  />
                  <button
                    onClick={() => handleSave('name')}
                    className="px-4 py-2 bg-white text-purple-600 rounded-xl hover:bg-white/90 transition-all font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl md:text-5xl font-bold">
                    {tripData?.name || 'Your Amazing Trip'}
                  </h1>
                  <button
                    onClick={() => setIsEditing('name')}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-white/60 text-sm mb-1">Share Code</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-mono font-bold bg-white/20 backdrop-blur px-4 py-2 rounded-xl">
                  {tripData?.shareCode}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tripData?.shareCode || '')
                    // Add toast notification here
                  }}
                  className="p-3 bg-white/20 backdrop-blur rounded-xl hover:bg-white/30 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            {quickStats.map((stat, index) => (
              <div 
                key={stat.label}
                className="bg-white/10 backdrop-blur rounded-2xl p-4 hover:bg-white/20 transition-all transform hover:scale-105 cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Planning Progress</h3>
              <p className="text-sm text-gray-600 mt-1">Complete these steps for the perfect trip</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-600">{progressPercentage}%</div>
                <div className="text-xs text-gray-500">Complete</div>
              </div>
              <button
                onClick={() => setIsProgressExpanded(!isProgressExpanded)}
                className="p-2 hover:bg-white rounded-xl transition-all"
              >
                <svg 
                  className={`w-6 h-6 text-gray-600 transition-transform ${isProgressExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Expandable Checklist */}
        <div className={`transition-all duration-500 ${isProgressExpanded ? 'max-h-[1000px]' : 'max-h-0'} overflow-hidden`}>
          <div className="p-6 bg-gray-50 border-t">
            <div className="grid grid-cols-2 gap-4">
              {progressItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`flex items-center gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-all transform hover:scale-[1.02] ${
                    item.completed ? 'opacity-100' : 'opacity-70'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="text-2xl">{item.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.completed ? (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                      )}
                      <span className={`text-sm font-medium ${item.completed ? 'text-gray-700 line-through' : 'text-gray-600'}`}>
                        {item.label}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    item.completed 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    +{item.points}%
                  </span>
                </div>
              ))}
            </div>

            {progressPercentage === 100 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <p className="text-green-800 font-semibold flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  Congratulations! Your trip is fully planned and ready to go!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Info Cards Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Destination Card */}
        <div 
          className="group relative bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white shadow-xl transform transition-all hover:scale-[1.03] hover:shadow-2xl cursor-pointer overflow-hidden"
          onMouseEnter={() => setHoveredCard('destination')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-purple-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="text-3xl">📍</div>
                <h3 className="text-lg font-semibold opacity-90">Destination</h3>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing('destination')}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full px-3 py-2 bg-white/20 backdrop-blur border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Destination city"
                />
                <input
                  type="text"
                  value={editValues.departureCity}
                  onChange={(e) => setEditValues({ ...editValues, departureCity: e.target.value })}
                  className="w-full px-3 py-2 bg-white/20 backdrop-blur border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Departure city"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('destination')}
                    className="flex-1 px-3 py-2 bg-white text-purple-600 rounded-lg hover:bg-white/90 transition-all font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold mb-2">
                  {tripData?.destinationCity || 'Not set'}
                </p>
                {tripData?.departureCity && (
                  <p className="text-white/80 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    from {tripData?.departureCity}
                  </p>
                )}
              </div>
            )}
          </div>
          {hoveredCard === 'destination' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 animate-pulse"></div>
          )}
        </div>

        {/* Dates Card */}
        <div 
          className="group relative bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-xl transform transition-all hover:scale-[1.03] hover:shadow-2xl cursor-pointer overflow-hidden"
          onMouseEnter={() => setHoveredCard('dates')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="text-3xl">📅</div>
                <h3 className="text-lg font-semibold opacity-90">Travel Dates</h3>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing('dates')}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full px-3 py-2 bg-white/20 backdrop-blur border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <input
                  type="date"
                  value={editValues.endDate}
                  onChange={(e) => setEditValues({ ...editValues, endDate: e.target.value })}
                  min={editValues.startDate}
                  className="w-full px-3 py-2 bg-white/20 backdrop-blur border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('dates')}
                    className="flex-1 px-3 py-2 bg-white text-blue-600 rounded-lg hover:bg-white/90 transition-all font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div>
                    <p className="text-sm opacity-80">{formatDate(tripData?.startDate).split(',')[0]}</p>
                    <p className="text-lg font-semibold">{formatDate(tripData?.startDate).split(',').slice(1).join(',')}</p>
                  </div>
                  <svg className="w-6 h-6 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div>
                    <p className="text-sm opacity-80">{formatDate(tripData?.endDate).split(',')[0]}</p>
                    <p className="text-lg font-semibold">{formatDate(tripData?.endDate).split(',').slice(1).join(',')}</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full mt-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span className="text-sm font-semibold">{calculateNights(tripData?.startDate, tripData?.endDate)} nights</span>
                </div>
              </div>
            )}
          </div>
          {hoveredCard === 'dates' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-400 animate-pulse"></div>
          )}
        </div>

        {/* Group Size Card */}
        <div 
          className="group relative bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-6 text-white shadow-xl transform transition-all hover:scale-[1.03] hover:shadow-2xl cursor-pointer overflow-hidden"
          onMouseEnter={() => setHoveredCard('group')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="text-3xl">👥</div>
                <h3 className="text-lg font-semibold opacity-90">Group Size</h3>
              </div>
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
                      onTripUpdate?.(updatedTrip)
                      addActivity({
                        type: 'update',
                        category: 'trip',
                        action: `Updated group size to ${newSize}`
                      })
                    }
                  } catch (error) {
                    console.error('Error updating group size:', error)
                  }
                }}
                className="w-12 h-12 bg-white/20 backdrop-blur hover:bg-white/30 rounded-full flex items-center justify-center transition-all transform hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              
              <div className="text-center">
                <div className="text-4xl font-bold">{tripData?.groupSize || 2}</div>
                <div className="text-sm opacity-80">{tripData?.groupSize === 1 ? 'Traveler' : 'Travelers'}</div>
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
                      onTripUpdate?.(updatedTrip)
                      addActivity({
                        type: 'update',
                        category: 'trip',
                        action: `Updated group size to ${newSize}`
                      })
                    }
                  } catch (error) {
                    console.error('Error updating group size:', error)
                  }
                }}
                className="w-12 h-12 bg-white/20 backdrop-blur hover:bg-white/30 rounded-full flex items-center justify-center transition-all transform hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
          {hoveredCard === 'group' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-green-400 animate-pulse"></div>
          )}
        </div>

        {/* Quick Actions Card */}
        <div 
          className="group relative bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-6 text-white shadow-xl transform transition-all hover:scale-[1.03] hover:shadow-2xl cursor-pointer overflow-hidden"
          onMouseEnter={() => setHoveredCard('actions')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-orange-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-3xl">⚡</div>
              <h3 className="text-lg font-semibold opacity-90">Quick Actions</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onTabChange?.('flights')}
                className="p-3 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all transform hover:scale-105"
              >
                <div className="text-2xl mb-1">✈️</div>
                <div className="text-xs">Add Flight</div>
              </button>
              <button 
                onClick={() => onTabChange?.('places')}
                className="p-3 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all transform hover:scale-105"
              >
                <div className="text-2xl mb-1">🏨</div>
                <div className="text-xs">Add Hotel</div>
              </button>
              <button 
                onClick={() => onTabChange?.('itinerary')}
                className="p-3 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all transform hover:scale-105"
              >
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-xs">Add Activity</div>
              </button>
              <button 
                onClick={() => onTabChange?.('budget')}
                className="p-3 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all transform hover:scale-105"
              >
                <div className="text-2xl mb-1">💰</div>
                <div className="text-xs">Set Budget</div>
              </button>
            </div>
          </div>
          {hoveredCard === 'actions' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 animate-pulse"></div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
        <ActivityFeed compact={true} maxItems={5} />
      </div>
    </div>
  )
}