'use client'

import { useState, useEffect } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

interface MyTripsProps {
  onTripSelected: (trip: any) => void
  onBackToHome: () => void
}

export default function MyTrips({ onTripSelected, onBackToHome }: MyTripsProps) {
  const { user } = useAuthenticator((context) => [context.user])
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Initialize Amplify data client
  const client = generateClient<Schema>()

  useEffect(() => {
    if (user) {
      loadUserTrips()
    }
  }, [user])

  const loadUserTrips = async () => {
    try {
      setLoading(true)
      
      // Fetch user's trips from DynamoDB
      const { data: tripData, errors } = await client.models.Trip.list({
        authMode: 'userPool' // Use authenticated user
      })
      
      if (errors) {
        console.error('Error loading trips:', errors)
        return
      }
      
      setTrips(tripData || [])
    } catch (error) {
      console.error('Error loading trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
    const end = new Date(endDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
    return `${start} - ${end}`
  }

  const getTripStatus = (startDate: string, endDate: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (now < start) return 'upcoming'
    if (now > end) return 'past'
    return 'active'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      case 'past': return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Upcoming'
      case 'active': return 'In Progress'
      case 'past': return 'Completed'
      default: return 'Unknown'
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🧳 My Trips
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage and view all your trips
          </p>
        </div>
        <button
          onClick={onBackToHome}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          ← Back to Home
        </button>
      </div>

      {/* Trips Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading your trips...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-bold mb-2">No Trips Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Start planning your first adventure!</p>
          <button
            onClick={onBackToHome}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg"
          >
            Create Your First Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => {
            const status = getTripStatus(trip.startDate, trip.endDate)
            
            return (
              <div
                key={trip.id}
                onClick={() => onTripSelected(trip)}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all cursor-pointer hover:scale-105"
              >
                {/* Trip Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">{trip.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      📍 {trip.destinationCity}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                    {getStatusText(status)}
                  </span>
                </div>

                {/* Trip Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>📅</span>
                    <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>👥</span>
                    <span>{trip.groupSize} traveler{trip.groupSize > 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>🔗</span>
                    <span className="font-mono text-xs">{trip.shareCode}</span>
                  </div>
                </div>

                {/* Trip Description */}
                {trip.description && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {trip.description.length > 100 
                        ? `${trip.description.substring(0, 100)}...`
                        : trip.description
                      }
                    </p>
                  </div>
                )}

                {/* Action Hint */}
                <div className="mt-4 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                  <span>Click to manage trip →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}