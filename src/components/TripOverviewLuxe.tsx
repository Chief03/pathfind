'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import ActivityFeed from './ActivityFeed'
import { useActivityTracker } from '@/contexts/ActivityTracker'

interface TripOverviewLuxeProps {
  tripData: any
  onTripUpdate?: (updatedTrip: any) => void
  flightCount?: number
  eventCount?: number
  placeCount?: number
  totalBudget?: number
}

export default function TripOverviewLuxe({ 
  tripData, 
  onTripUpdate, 
  flightCount = 0, 
  eventCount = 0, 
  placeCount = 0, 
  totalBudget = 0 
}: TripOverviewLuxeProps) {
  const { addActivity } = useActivityTracker()
  const [isEditing, setIsEditing] = useState<string | null>(null)
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

  const formatDate = (dateStr: string, format: 'short' | 'long' = 'short') => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (format === 'short') {
      return date.toLocaleDateString('en-US', { 
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

  const handleSave = async (field: string) => {
    try {
      const client = generateClient() as any
      const updateData: any = { id: tripData.id }
      
      if (field === 'dates') {
        updateData.startDate = editValues.startDate
        updateData.endDate = editValues.endDate
      } else if (field === 'destination') {
        updateData.destinationCity = editValues.destinationCity
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

  const statsCards = [
    {
      id: 'flights',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
        </svg>
      ),
      label: 'Flights',
      value: flightCount,
      color: 'from-sky-500 to-blue-600'
    },
    {
      id: 'events',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Activities',
      value: eventCount,
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'places',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Places',
      value: placeCount,
      color: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'budget',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Budget',
      value: `$${totalBudget.toLocaleString()}`,
      color: 'from-amber-500 to-orange-600'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Elegant Header */}
      <div className="relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl opacity-95"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500 rounded-full filter blur-3xl opacity-20"></div>
        
        {/* Content */}
        <div className="relative p-10">
          <div className="flex items-start justify-between">
            <div>
              {isEditing === 'name' ? (
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={editValues.name}
                    onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                    className="text-4xl font-light bg-white/10 backdrop-blur text-white px-4 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-white/40"
                    placeholder="Trip name"
                  />
                  <button
                    onClick={() => handleSave('name')}
                    className="px-4 py-2 bg-white/20 backdrop-blur text-white rounded-xl hover:bg-white/30 transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-white/10 backdrop-blur text-white/70 rounded-xl hover:bg-white/20 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <h1 className="text-5xl font-light text-white tracking-tight">
                    {tripData?.name || 'Untitled Journey'}
                  </h1>
                  <button
                    onClick={() => setIsEditing('name')}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all"
                  >
                    <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2 text-white/80">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="font-light">{tripData?.destinationCity || 'Destination'}</span>
                </div>
                
                <div className="flex items-center gap-2 text-white/80">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-light">
                    {formatDate(tripData?.startDate)} - {formatDate(tripData?.endDate)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-white/80">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-light">{tripData?.groupSize || 2} travelers</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigator.clipboard.writeText(tripData?.shareCode || '')}
              className="px-6 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-2xl hover:bg-white/20 transition-all flex items-center gap-3 group"
            >
              <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
              </svg>
              <span className="text-white/90 font-light">Share Journey</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        {statsCards.map((card) => (
          <div
            key={card.id}
            onMouseEnter={() => setHoveredCard(card.id)}
            onMouseLeave={() => setHoveredCard(null)}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl transform transition-transform group-hover:scale-105"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all">
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${card.color} text-white mb-4 transform transition-transform ${hoveredCard === card.id ? 'scale-110' : ''}`}>
                {card.icon}
              </div>
              <p className="text-3xl font-light text-gray-900 mb-1">{card.value}</p>
              <p className="text-sm text-gray-500 font-light">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Destination Card */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Journey Details</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing('destination')}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            
            {isEditing === 'destination' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Destination</label>
                  <input
                    type="text"
                    value={editValues.destinationCity}
                    onChange={(e) => setEditValues({ ...editValues, destinationCity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Departure From</label>
                  <input
                    type="text"
                    value={editValues.departureCity}
                    onChange={(e) => setEditValues({ ...editValues, departureCity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleSave('destination')}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Destination</p>
                  <p className="text-xl font-light text-gray-900">{tripData?.destinationCity || 'Not set'}</p>
                </div>
                {tripData?.departureCity && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Departing From</p>
                    <p className="text-xl font-light text-gray-900">{tripData?.departureCity}</p>
                  </div>
                )}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Share Code</p>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                    <span className="font-mono text-lg font-semibold text-purple-600">{tripData?.shareCode}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(tripData?.shareCode || '')}
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dates Card */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Travel Dates</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing('dates')}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            
            {isEditing === 'dates' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={editValues.startDate}
                    onChange={(e) => setEditValues({ ...editValues, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={editValues.endDate}
                    onChange={(e) => setEditValues({ ...editValues, endDate: e.target.value })}
                    min={editValues.startDate}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleSave('dates')}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Departure</p>
                    <p className="text-lg font-light text-gray-900">{formatDate(tripData?.startDate)}</p>
                    <p className="text-xs text-gray-400">{formatDate(tripData?.startDate, 'long').split(',')[0]}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Return</p>
                    <p className="text-lg font-light text-gray-900">{formatDate(tripData?.endDate)}</p>
                    <p className="text-xs text-gray-400">{formatDate(tripData?.endDate, 'long').split(',')[0]}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-light text-gray-900">
                        {calculateNights(tripData?.startDate, tripData?.endDate)}
                      </p>
                      <p className="text-xs text-gray-500">nights</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-light text-gray-900">
                        {calculateNights(tripData?.startDate, tripData?.endDate) + 1}
                      </p>
                      <p className="text-xs text-gray-500">days</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Group Size Card */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Travel Party</h3>
            
            <div className="flex items-center justify-center py-4">
              <button
                onClick={async () => {
                  const newSize = Math.max(1, (tripData?.groupSize || 2) - 1)
                  try {
                    const client = generateClient()
                    const { data: updatedTrip } = await (client as any).models.Trip.update({
                      id: tripData.id,
                      groupSize: newSize
                    })
                    if (updatedTrip && onTripUpdate) {
                      onTripUpdate(updatedTrip)
                      addActivity({
                        type: 'update',
                        category: 'trip',
                        action: `Updated group size to ${newSize}`,
                        details: { groupSize: newSize }
                      })
                    }
                  } catch (error) {
                    console.error('Error updating group size:', error)
                  }
                }}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              
              <div className="mx-8 text-center">
                <p className="text-4xl font-light text-gray-900">{tripData?.groupSize || 2}</p>
                <p className="text-xs text-gray-500 mt-1">{tripData?.groupSize === 1 ? 'traveler' : 'travelers'}</p>
              </div>
              
              <button
                onClick={async () => {
                  const newSize = Math.min(20, (tripData?.groupSize || 2) + 1)
                  try {
                    const client = generateClient()
                    const { data: updatedTrip } = await (client as any).models.Trip.update({
                      id: tripData.id,
                      groupSize: newSize
                    })
                    if (updatedTrip && onTripUpdate) {
                      onTripUpdate(updatedTrip)
                      addActivity({
                        type: 'update',
                        category: 'trip',
                        action: `Updated group size to ${newSize}`,
                        details: { groupSize: newSize }
                      })
                    }
                  } catch (error) {
                    console.error('Error updating group size:', error)
                  }
                }}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
              <p className="text-xs text-gray-600 text-center">
                Perfect for {tripData?.groupSize <= 2 ? 'a romantic getaway' : tripData?.groupSize <= 4 ? 'a small group adventure' : 'a group celebration'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Recent Activity</h3>
        <ActivityFeed compact={true} maxItems={5} />
      </div>
    </div>
  )
}