'use client'

import { useState } from 'react'
import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react'
import { generateClient } from 'aws-amplify/data'
import DatePicker from './DatePicker'

interface HeroSectionProps {
  onTripCreated: (trip: any) => void
}

export default function HeroSection({ onTripCreated }: HeroSectionProps) {
  const { user } = useAuthenticator((context) => [context.user])
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [shareCode, setShareCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [formData, setFormData] = useState({
    tripName: '',
    destination: '',
    startDate: '',
    endDate: '',
    groupSize: 2,
    departure: ''
  })
  
  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setShowAuthModal(true)
      return
    }

    try {
      // Create client after user is authenticated
      const client = generateClient()
      
      // Create trip using Amplify Data
      const { data: newTrip } = await (client as any).models.Trip.create({
        name: formData.tripName || `Trip to ${formData.destination}`,
        destinationCity: formData.destination,
        departureCity: formData.departure,
        startDate: formData.startDate,
        endDate: formData.endDate,
        groupSize: formData.groupSize,
        shareCode: generateShareCode(),
      })

      if (newTrip) {
        onTripCreated(newTrip)
      }
    } catch (error) {
      console.error('Error creating trip:', error)
    }
  }

  const generateShareCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleJoinTrip = async () => {
    if (!shareCode.trim()) {
      setJoinError('Please enter a share code')
      return
    }

    if (!user) {
      setShowAuthModal(true)
      return
    }

    try {
      const client = generateClient()
      
      // Find trip by share code
      const { data: trips } = await (client as any).models.Trip.list({
        filter: { shareCode: { eq: shareCode.toUpperCase() } }
      })

      if (trips && trips.length > 0) {
        onTripCreated(trips[0])
        setShowJoinModal(false)
      } else {
        setJoinError('Invalid share code. Please check and try again.')
      }
    } catch (error) {
      console.error('Error joining trip:', error)
      setJoinError('Failed to join trip. Please try again.')
    }
  }

  return (
    <>
      <div className="relative bg-cover bg-center min-h-[600px] flex items-center justify-center"
           style={{ backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Plan Your Perfect Trip Together
          </h1>
          <p className="text-xl text-white/90 mb-12">
            Collaborate with friends, discover events, and create unforgettable memories
          </p>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trip Name
              </label>
              <input
                type="text"
                value={formData.tripName}
                onChange={(e) => setFormData({...formData, tripName: e.target.value})}
                placeholder="e.g. The Boys Out, Girls Weekend, Family Vacation"
                className="input-field"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Where to?
                </label>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
                  placeholder="Enter destination city"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From where?
                </label>
                <input
                  type="text"
                  value={formData.departure}
                  onChange={(e) => setFormData({...formData, departure: e.target.value})}
                  placeholder="Enter departure city"
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <DatePicker
                  value={formData.startDate}
                  onChange={(newStartDate) => {
                    setFormData({
                      ...formData, 
                      startDate: newStartDate,
                      // Clear end date if it's before the new start date
                      endDate: formData.endDate && formData.endDate < newStartDate ? '' : formData.endDate
                    })
                  }}
                  min={today}
                  placeholder="Select start date"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <DatePicker
                  value={formData.endDate}
                  onChange={(date) => setFormData({...formData, endDate: date})}
                  min={formData.startDate || today}
                  placeholder="Select end date"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Size
                </label>
                <select
                  value={formData.groupSize}
                  onChange={(e) => setFormData({...formData, groupSize: parseInt(e.target.value)})}
                  className="input-field"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <button type="submit" className="btn-primary w-full text-lg py-4">
                Start Planning Your Trip
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">OR</span>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={() => setShowJoinModal(true)}
                className="w-full text-lg py-4 px-6 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold"
              >
                Join Existing Trip with Code
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Join Trip Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <button
              onClick={() => {
                setShowJoinModal(false)
                setJoinError('')
                setShareCode('')
              }}
              className="float-right text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Join a Trip</h2>
              <p className="text-gray-600">Enter the share code from your friend</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trip Share Code
                </label>
                <input
                  type="text"
                  value={shareCode}
                  onChange={(e) => {
                    setShareCode(e.target.value.toUpperCase())
                    setJoinError('')
                  }}
                  placeholder="e.g. ABC12345"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-xl font-mono uppercase"
                  maxLength={8}
                />
                {joinError && (
                  <p className="text-red-500 text-sm mt-2">{joinError}</p>
                )}
              </div>

              <button
                onClick={handleJoinTrip}
                disabled={!shareCode.trim()}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                  shareCode.trim() 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Join Trip
              </button>

              <p className="text-center text-sm text-gray-500">
                Don't have a code? Ask your trip organizer to share it with you.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <button
              onClick={() => setShowAuthModal(false)}
              className="float-right text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <Authenticator>
              {({ signOut, user: authUser }) => {
                // Once authenticated, close modal and submit form
                if (authUser && !user) {
                  setTimeout(() => {
                    setShowAuthModal(false)
                    handleSubmit(new Event('submit') as any)
                  }, 100)
                }
                return authUser ? (
                  <div className="text-center">
                    <p className="mb-4">Welcome {authUser.username}!</p>
                    <button 
                      onClick={() => {
                        setShowAuthModal(false)
                        handleSubmit(new Event('submit') as any)
                      }}
                      className="btn-primary w-full"
                    >
                      Continue
                    </button>
                  </div>
                ) : <></>
              }}
            </Authenticator>
          </div>
        </div>
      )}
    </>
  )
}