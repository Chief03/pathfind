'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'

interface TripOverviewCardsProps {
  tripData: any
  onTripUpdate?: (updatedTrip: any) => void
}

export default function TripOverviewCards({ tripData, onTripUpdate }: TripOverviewCardsProps) {
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

  const handleCancel = (field: string) => {
    setEditValues({
      ...editValues,
      [field]: tripData[field]
    })
    setIsEditing(null)
  }

  const cards = [
    {
      id: 'destination',
      title: '📍 Destination',
      icon: '🌍',
      content: (
        <div className="space-y-3">
          {isEditing === 'destination' ? (
            <>
              <div>
                <label className="text-xs text-gray-500">Destination City</label>
                <input
                  type="text"
                  value={editValues.destinationCity}
                  onChange={(e) => setEditValues({ ...editValues, destinationCity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Where to?"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Departure City</label>
                <input
                  type="text"
                  value={editValues.departureCity}
                  onChange={(e) => setEditValues({ ...editValues, departureCity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Where from?"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('destination')}
                  className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => handleCancel('destination')}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-2xl font-bold text-gray-800">{tripData?.destinationCity}</p>
                {tripData?.departureCity && (
                  <p className="text-sm text-gray-500 mt-1">From: {tripData?.departureCity}</p>
                )}
              </div>
            </>
          )}
        </div>
      )
    },
    {
      id: 'dates',
      title: '📅 Dates',
      icon: '🗓️',
      content: (
        <div className="space-y-3">
          {isEditing === 'dates' ? (
            <>
              <div>
                <label className="text-xs text-gray-500">Start Date</label>
                <input
                  type="date"
                  value={editValues.startDate}
                  onChange={(e) => setEditValues({ ...editValues, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">End Date</label>
                <input
                  type="date"
                  value={editValues.endDate}
                  onChange={(e) => setEditValues({ ...editValues, endDate: e.target.value })}
                  min={editValues.startDate}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('dates')}
                  className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => handleCancel('dates')}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-lg font-semibold text-gray-800">
                  {new Date(tripData?.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' - '}
                  {new Date(tripData?.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {calculateNights(tripData?.startDate, tripData?.endDate)} nights
                </p>
              </div>
            </>
          )}
        </div>
      )
    },
    {
      id: 'groupSize',
      title: '👥 Group Size',
      icon: '👨‍👩‍👧‍👦',
      content: (
        <div className="space-y-3">
          {isEditing === 'groupSize' ? (
            <>
              <div>
                <label className="text-xs text-gray-500">Number of Travelers</label>
                <input
                  type="number"
                  value={editValues.groupSize}
                  onChange={(e) => setEditValues({ ...editValues, groupSize: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('groupSize')}
                  className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => handleCancel('groupSize')}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-3xl font-bold text-gray-800">{tripData?.groupSize}</p>
                <p className="text-sm text-gray-500">
                  {tripData?.groupSize === 1 ? 'Solo traveler' : 'Travelers'}
                </p>
              </div>
            </>
          )}
        </div>
      )
    },
    {
      id: 'shareCode',
      title: '🔗 Share Code',
      icon: '📤',
      content: (
        <div>
          <p className="text-2xl font-mono font-bold text-blue-600">{tripData?.shareCode}</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(tripData?.shareCode || '')
              // Could add a toast notification here
            }}
            className="mt-2 text-sm text-blue-500 hover:text-blue-700"
          >
            Copy to clipboard
          </button>
        </div>
      )
    },
    {
      id: 'name',
      title: '✏️ Trip Name',
      icon: '🏷️',
      content: (
        <div className="space-y-3">
          {isEditing === 'name' ? (
            <>
              <input
                type="text"
                value={editValues.name}
                onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Trip name"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('name')}
                  className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => handleCancel('name')}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <p className="text-xl font-semibold text-gray-800">{tripData?.name}</p>
          )}
        </div>
      )
    },
    {
      id: 'quickStats',
      title: '📊 Quick Stats',
      icon: '📈',
      editable: false,
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-blue-500">0</p>
            <p className="text-xs text-gray-500">Flights</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500">0</p>
            <p className="text-xs text-gray-500">Places</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-500">0</p>
            <p className="text-xs text-gray-500">Activities</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-500">$0</p>
            <p className="text-xs text-gray-500">Budget</p>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 relative"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{card.icon}</span>
              <h3 className="text-lg font-semibold text-gray-700">{card.title}</h3>
            </div>
            {card.editable !== false && isEditing !== card.id && (
              <button
                onClick={() => setIsEditing(card.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
          <div>{card.content}</div>
        </div>
      ))}
    </div>
  )
}