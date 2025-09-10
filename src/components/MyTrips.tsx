'use client'

import { useState, useEffect } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import SubscriptionUpgradeModal from './SubscriptionUpgradeModal'

interface MyTripsProps {
  onTripSelected: (trip: any) => void
  onBackToHome: () => void
}

export default function MyTrips({ onTripSelected, onBackToHome }: MyTripsProps) {
  const { user } = useAuthenticator((context) => [context.user])
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)
  
  // Initialize Amplify data client
  const client = generateClient<Schema>()

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Load user profile and trips in parallel
      const [tripsResult, profileResult] = await Promise.all([
        client.models.Trip.list({
          authMode: 'userPool'
        }),
        client.models.UserProfile.get({
          userId: user.userId
        })
      ])
      
      if (tripsResult.errors) {
        console.error('Error loading trips:', tripsResult.errors)
      } else {
        setTrips(tripsResult.data || [])
      }
      
      if (profileResult.data) {
        setUserProfile(profileResult.data)
      }
      
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteTrip = async (tripId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent trip selection when clicking delete
    
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingTripId(tripId)
      
      // Delete the trip
      const { errors } = await client.models.Trip.delete({ id: tripId })
      
      if (errors) {
        console.error('Error deleting trip:', errors)
        alert('Failed to delete trip. Please try again.')
        return
      }
      
      // Update local state
      setTrips(trips.filter(trip => trip.id !== tripId))
      
      // Update user's trip count
      if (userProfile) {
        const newTripCount = Math.max(0, (userProfile.tripCount || 0) - 1)
        await client.models.UserProfile.update({
          userId: user.userId,
          tripCount: newTripCount
        })
        setUserProfile({ ...userProfile, tripCount: newTripCount })
      }
      
    } catch (error) {
      console.error('Error deleting trip:', error)
      alert('Failed to delete trip. Please try again.')
    } finally {
      setDeletingTripId(null)
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
          <div className="flex items-center gap-4 mt-2">
            <p className="text-gray-600 dark:text-gray-400">
              Manage and view all your trips
            </p>
            {userProfile && (
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  userProfile.subscriptionType === 'premium' 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white' 
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                }`}>
                  {userProfile.subscriptionType === 'premium' ? '⭐ Premium' : '🆓 Free'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {trips.length}/{userProfile.maxTrips || 5} trips
                </span>
              </div>
            )}
          </div>
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
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all group"
              >
                {/* Trip Header */}
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => onTripSelected(trip)}
                  >
                    <h3 className="text-lg font-bold mb-1 group-hover:text-blue-600 transition-colors">{trip.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      📍 {trip.destinationCity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                      {getStatusText(status)}
                    </span>
                    <button
                      onClick={(e) => deleteTrip(trip.id, e)}
                      disabled={deletingTripId === trip.id}
                      className={`p-2 rounded-lg transition-colors ${
                        deletingTripId === trip.id
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                      title="Delete trip"
                    >
                      {deletingTripId === trip.id ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
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

                {/* Action Buttons */}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => onTripSelected(trip)}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:scale-105 transition-transform text-sm"
                  >
                    Manage Trip →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Subscription Upgrade Modal */}
      {showUpgradeModal && userProfile && (
        <SubscriptionUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentCount={trips.length}
          maxTrips={userProfile.maxTrips || 5}
          subscriptionType={userProfile.subscriptionType || 'free'}
        />
      )}
    </div>
  )
}