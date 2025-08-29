'use client'

import { useState } from 'react'
import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

interface HeroSectionProps {
  onTripCreated: (trip: any) => void
}

export default function HeroSection({ onTripCreated }: HeroSectionProps) {
  const { user } = useAuthenticator((context) => [context.user])
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [formData, setFormData] = useState({
    tripName: '',
    destination: '',
    startDate: '',
    endDate: '',
    groupSize: 2,
    departure: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setShowAuthModal(true)
      return
    }

    try {
      // Create client after user is authenticated
      const client = generateClient<Schema>()
      
      // Create trip using Amplify Data
      const { data: newTrip } = await client.models.Trip.create({
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
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
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

            <button type="submit" className="btn-primary w-full text-lg py-4">
              Start Planning Your Trip
            </button>
          </form>
        </div>
      </div>

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