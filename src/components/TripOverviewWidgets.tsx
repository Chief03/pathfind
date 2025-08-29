'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'

interface TripOverviewWidgetsProps {
  tripData: any
  onTripUpdate?: (updatedTrip: any) => void
  flightCount?: number
  eventCount?: number
  placeCount?: number
  totalBudget?: number
}

export default function TripOverviewWidgets({ tripData, onTripUpdate, flightCount = 0, eventCount = 0, placeCount = 0, totalBudget = 0 }: TripOverviewWidgetsProps) {
  const [isEditing, setIsEditing] = useState<string | null>(null)
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

  const widgets = [
    {
      id: 'destination',
      size: 'large',
      content: (
        <div className="h-full flex flex-col justify-between">
          {isEditing === 'destination' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">📍</span>
                <h3 className="text-white font-bold text-lg">Edit Destination</h3>
              </div>
              <input
                type="text"
                value={editValues.destinationCity}
                onChange={(e) => setEditValues({ ...editValues, destinationCity: e.target.value })}
                className="w-full px-4 py-3 bg-white/20 backdrop-blur text-white placeholder-white/60 rounded-xl border border-white/30 focus:outline-none focus:border-white"
                placeholder="Where to?"
              />
              <input
                type="text"
                value={editValues.departureCity}
                onChange={(e) => setEditValues({ ...editValues, departureCity: e.target.value })}
                className="w-full px-4 py-3 bg-white/20 backdrop-blur text-white placeholder-white/60 rounded-xl border border-white/30 focus:outline-none focus:border-white"
                placeholder="Where from?"
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleSave('destination')}
                  className="px-4 py-2 bg-white text-purple-600 rounded-full font-semibold hover:scale-105 transition-transform"
                >
                  Save ✨
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-white/20 text-white rounded-full font-semibold hover:bg-white/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-4xl">🌍</span>
                  <span className="text-white/80 text-sm font-medium">DESTINATION</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                  {tripData?.destinationCity || 'No destination'}
                </h2>
                {tripData?.departureCity && (
                  <p className="text-white/80 text-sm flex items-center gap-1">
                    <span>✈️ from</span> 
                    <span className="font-semibold">{tripData?.departureCity}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsEditing('destination')}
                className="self-end bg-white/20 backdrop-blur hover:bg-white/30 p-2 rounded-full transition-all hover:scale-110"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </>
          )}
        </div>
      )
    },
    {
      id: 'dates',
      size: 'medium',
      content: (
        <div className="h-full flex flex-col justify-between">
          {isEditing === 'dates' ? (
            <div className="space-y-3">
              <h3 className="text-white font-bold flex items-center gap-2">
                <span>📅</span> Edit Dates
              </h3>
              <input
                type="date"
                value={editValues.startDate}
                onChange={(e) => setEditValues({ ...editValues, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-white/20 backdrop-blur text-white rounded-lg border border-white/30 focus:outline-none focus:border-white"
              />
              <input
                type="date"
                value={editValues.endDate}
                onChange={(e) => setEditValues({ ...editValues, endDate: e.target.value })}
                min={editValues.startDate}
                className="w-full px-3 py-2 bg-white/20 backdrop-blur text-white rounded-lg border border-white/30 focus:outline-none focus:border-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('dates')}
                  className="px-3 py-1.5 bg-white text-blue-600 rounded-full text-sm font-semibold hover:scale-105 transition-transform"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 bg-white/20 text-white rounded-full text-sm font-semibold hover:bg-white/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">🗓️</span>
                  <button
                    onClick={() => setIsEditing('dates')}
                    className="bg-white/20 backdrop-blur hover:bg-white/30 p-1.5 rounded-full transition-all hover:scale-110"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
                <p className="text-white font-bold text-base md:text-lg mb-1">
                  {new Date(tripData?.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' - '}
                  {new Date(tripData?.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-white/90 text-xl md:text-2xl font-bold">
                  {calculateNights(tripData?.startDate, tripData?.endDate)} nights 🌙
                </p>
              </div>
            </>
          )}
        </div>
      )
    },
    {
      id: 'groupSize',
      size: 'medium',
      content: (
        <div className="h-full flex flex-col justify-between">
          {isEditing === 'groupSize' ? (
            <div className="space-y-3">
              <h3 className="text-white font-bold flex items-center gap-2">
                <span>👥</span> Group Size
              </h3>
              <input
                type="number"
                value={editValues.groupSize}
                onChange={(e) => setEditValues({ ...editValues, groupSize: parseInt(e.target.value) || 1 })}
                min="1"
                max="20"
                className="w-full px-3 py-2 bg-white/20 backdrop-blur text-white text-center text-2xl font-bold rounded-lg border border-white/30 focus:outline-none focus:border-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('groupSize')}
                  className="px-3 py-1.5 bg-white text-green-600 rounded-full text-sm font-semibold hover:scale-105 transition-transform"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 bg-white/20 text-white rounded-full text-sm font-semibold hover:bg-white/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">👯‍♀️</span>
                  <button
                    onClick={() => setIsEditing('groupSize')}
                    className="bg-white/20 backdrop-blur hover:bg-white/30 p-1.5 rounded-full transition-all hover:scale-110"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
                <p className="text-4xl md:text-5xl font-bold text-white mb-1">
                  {tripData?.groupSize}
                </p>
                <p className="text-white/80 text-sm">
                  {tripData?.groupSize === 1 ? 'Solo adventure 🎒' : 'Squad members 🎉'}
                </p>
              </div>
            </>
          )}
        </div>
      )
    },
    {
      id: 'shareCode',
      size: 'medium',
      content: (
        <div className="h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl">🎫</span>
              <span className="text-white/80 text-sm font-medium">SHARE CODE</span>
            </div>
            <p className="text-2xl md:text-3xl font-mono font-bold text-white mb-3 tracking-wider">
              {tripData?.shareCode}
            </p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(tripData?.shareCode || '')
              // Could show a toast here
            }}
            className="bg-white/20 backdrop-blur hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2 justify-center"
          >
            <span>Copy</span>
            <span>📋</span>
          </button>
        </div>
      )
    },
    {
      id: 'vibes',
      size: 'medium',
      content: (
        <div className="h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl">✨</span>
              <span className="text-white/80 text-sm font-medium">TRIP VIBES</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <span className="text-white text-xs md:text-sm">Adventure Mode: ON</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <span className="text-white text-xs md:text-sm">Excitement: MAX</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">💫</span>
                <span className="text-white text-xs md:text-sm">Memories: 100%</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'quickStats',
      size: 'medium',
      content: (
        <div className="h-full">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl">📊</span>
            <span className="text-white/80 text-sm font-medium">QUICK STATS</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{flightCount}</p>
              <p className="text-[10px] md:text-xs text-white/90">Flights ✈️</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{placeCount}</p>
              <p className="text-[10px] md:text-xs text-white/90">Places 📍</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{eventCount}</p>
              <p className="text-[10px] md:text-xs text-white/90">Events 🎉</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">${totalBudget}</p>
              <p className="text-[10px] md:text-xs text-white/90">Budget 💸</p>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5">
      {/* Main destination gadget - full width */}
      <div className="grid grid-cols-1">
        {widgets.filter(w => w.size === 'large').map((widget) => (
          <div
            key={widget.id}
            className="relative"
          >
            {/* Gadget frame with 3D effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl transform translate-y-1"></div>
            <div className="relative bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 rounded-3xl p-1 shadow-2xl">
              {/* Inner bezel */}
              <div className="bg-gradient-to-b from-gray-900 to-black rounded-3xl p-1">
                {/* Screen area with subtle inset shadow */}
                <div className="bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 rounded-2xl p-8 shadow-inner min-h-[200px]">
                  {/* Glossy overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-2xl pointer-events-none"></div>
                  <div className="relative">
                    {widget.content}
                  </div>
                </div>
              </div>
            </div>
            {/* Bottom edge highlight for 3D effect */}
            <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
          </div>
        ))}
      </div>

      {/* 2x3 Grid for medium gadgets */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {widgets.filter(w => w.size === 'medium').map((widget) => {
          // Define gadget colors based on widget ID
          const gadgetColors = {
            'dates': 'from-blue-900 to-cyan-900',
            'groupSize': 'from-green-900 to-emerald-900', 
            'shareCode': 'from-yellow-900 to-orange-900',
            'vibes': 'from-violet-900 to-indigo-900',
            'quickStats': 'from-pink-900 to-rose-900'
          }
          const screenColor = gadgetColors[widget.id as keyof typeof gadgetColors] || 'from-gray-900 to-gray-800'
          
          return (
            <div
              key={widget.id}
              className="relative transform hover:scale-[1.02] transition-transform"
            >
              {/* Gadget frame with 3D effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl transform translate-y-1"></div>
              <div className="relative bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 rounded-2xl p-1 shadow-2xl">
                {/* Inner bezel */}
                <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl p-0.5">
                  {/* Screen area */}
                  <div className={`bg-gradient-to-br ${screenColor} rounded-xl p-5 shadow-inner min-h-[160px] flex flex-col`}>
                    {/* Glossy overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-xl pointer-events-none"></div>
                    {/* LED indicator light */}
                    <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50 animate-pulse"></div>
                    <div className="relative">
                      {widget.content}
                    </div>
                  </div>
                </div>
              </div>
              {/* Bottom edge highlight */}
              <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}