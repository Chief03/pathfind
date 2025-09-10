'use client'

import { useState } from 'react'
import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react'
import { generateClient } from 'aws-amplify/data'
import DatePicker from './DatePicker'
import SubscriptionUpgradeModal from './SubscriptionUpgradeModal'

interface HeroSectionProps {
  onTripCreated: (trip: any) => void
}

const destinations = [
  { city: 'Paris', country: 'France', image: '🗼', tag: 'Romance' },
  { city: 'Tokyo', country: 'Japan', image: '🗾', tag: 'Culture' },
  { city: 'New York', country: 'USA', image: '🗽', tag: 'Urban' },
  { city: 'Bali', country: 'Indonesia', image: '🌴', tag: 'Tropical' },
  { city: 'Dubai', country: 'UAE', image: '🏙️', tag: 'Luxury' },
  { city: 'London', country: 'UK', image: '🎡', tag: 'History' }
]

const features = [
  {
    icon: '🤝',
    title: 'Collaborative Planning',
    description: 'Plan together in real-time with your travel group'
  },
  {
    icon: '📍',
    title: 'Smart Recommendations',
    description: 'AI-powered suggestions for places and activities'
  },
  {
    icon: '💰',
    title: 'Budget Tracking',
    description: 'Keep track of expenses and split costs easily'
  },
  {
    icon: '✈️',
    title: 'Flight Management',
    description: 'Organize all flight details in one place'
  }
]

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Adventure Traveler',
    quote: 'Finally, a trip planning app that actually makes group travel easier!',
    rating: 5,
    avatar: '👩'
  },
  {
    name: 'Mike Johnson',
    role: 'Digital Nomad',
    quote: 'The collaborative features saved our friend group so much hassle.',
    rating: 5,
    avatar: '👨'
  },
  {
    name: 'Emma Wilson',
    role: 'Travel Blogger',
    quote: 'Beautiful interface and incredibly intuitive to use.',
    rating: 5,
    avatar: '👩‍💼'
  }
]

const steps = [
  {
    number: '01',
    title: 'Create Your Trip',
    description: 'Set your destination and travel dates'
  },
  {
    number: '02',
    title: 'Invite Friends',
    description: 'Share your trip code with travel companions'
  },
  {
    number: '03',
    title: 'Plan Together',
    description: 'Collaborate on itinerary, places, and budget'
  },
  {
    number: '04',
    title: 'Enjoy Your Journey',
    description: 'Travel stress-free with everything organized'
  }
]

export default function HeroSection({ onTripCreated }: HeroSectionProps) {
  const { user } = useAuthenticator((context) => [context.user])
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [shareCode, setShareCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null)
  const [checkingCode, setCheckingCode] = useState(false)
  const [useCustomCode, setUseCustomCode] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [tripLimitError, setTripLimitError] = useState<any>(null)
  const [formData, setFormData] = useState({
    tripName: '',
    destination: '',
    startDate: '',
    endDate: '',
    groupSize: 2
  })
  
  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setShowAuthModal(true)
      return
    }

    // Validate custom code if using one
    if (useCustomCode && (!customCode || customCode.length < 4)) {
      alert('Trip code must be at least 4 characters')
      return
    }

    if (useCustomCode && codeAvailable === false) {
      alert('This trip code is already taken. Please choose another.')
      return
    }

    try {
      // Create client after user is authenticated
      const client = generateClient()
      
      // Use custom code or generate one
      const tripCode = useCustomCode && customCode ? 
        customCode.toLowerCase().replace(/\s+/g, '-') : 
        generateShareCode()
      
      // Create trip using Amplify Data
      const { data: newTrip } = await (client as any).models.Trip.create({
        name: formData.tripName || `Trip to ${formData.destination}`,
        destinationCity: formData.destination,
        departureCity: '',
        startDate: formData.startDate,
        endDate: formData.endDate,
        groupSize: formData.groupSize,
        shareCode: tripCode,
      })

      if (newTrip) {
        onTripCreated(newTrip)
      }
    } catch (error: any) {
      console.error('Error creating trip:', error)
      
      // Check if it's a trip limit error
      if (error?.__typename === 'TripLimitError' || error?.message?.includes('maximum number of trips')) {
        setTripLimitError(error)
        setShowUpgradeModal(true)
      } else if (error?.message?.includes('shareCode')) {
        alert('This trip code is already in use. Please choose another.')
      } else {
        alert('Failed to create trip. Please try again.')
      }
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

  const checkCodeAvailability = async (code: string) => {
    if (!code || code.length < 4) {
      setCodeAvailable(null)
      return
    }

    setCheckingCode(true)
    try {
      const client = generateClient()
      const normalizedCode = code.toLowerCase().replace(/\s+/g, '-')
      
      // Query for existing trips with this code
      const { data: existingTrips } = await (client as any).models.Trip.list({
        filter: { shareCode: { eq: normalizedCode } }
      })
      
      setCodeAvailable(!existingTrips || existingTrips.length === 0)
    } catch (error) {
      console.error('Error checking code:', error)
    } finally {
      setCheckingCode(false)
    }
  }

  const handleJoinTrip = async () => {
    if (!shareCode.trim()) {
      setJoinError('Please enter a trip code')
      return
    }

    if (!user) {
      setShowAuthModal(true)
      return
    }

    try {
      const client = generateClient()
      
      // Normalize the code (lowercase, replace spaces with hyphens)
      const normalizedCode = shareCode.toLowerCase().trim().replace(/\s+/g, '-')
      
      // Find trip by share code (try both normalized and uppercase for backward compatibility)
      const { data: trips } = await (client as any).models.Trip.list({
        filter: { shareCode: { eq: normalizedCode } }
      })
      
      // If not found with normalized, try uppercase (for old trips)
      let foundTrips = trips
      if (!trips || trips.length === 0) {
        const { data: upperTrips } = await (client as any).models.Trip.list({
          filter: { shareCode: { eq: shareCode.toUpperCase() } }
        })
        foundTrips = upperTrips
      }

      if (foundTrips && foundTrips.length > 0) {
        onTripCreated(foundTrips[0])
        setShowJoinModal(false)
        setShareCode('')
        setJoinError('')
      } else {
        setJoinError('Trip not found. Please check the code and try again.')
      }
    } catch (error) {
      console.error('Error joining trip:', error)
      setJoinError('Failed to join trip. Please try again.')
    }
  }

  const handleDestinationClick = (city: string) => {
    setFormData({ ...formData, destination: city })
  }

  return (
    <>
      {/* Enhanced Hero Section */}
      <div className="relative min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-400 to-pink-400 rounded-full filter blur-3xl opacity-10 animate-pulse delay-2000"></div>
        </div>

        {/* Navigation Bar */}
        <nav className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-3xl">✈️</span>
              <span className="text-2xl font-bold text-white">Pathfind</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-white/80 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors">How It Works</a>
              <a href="#testimonials" className="text-white/80 hover:text-white transition-colors">Reviews</a>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-2 bg-white/10 backdrop-blur text-white rounded-full border border-white/20 hover:bg-white/20 transition-all"
              >
                Join Trip
              </button>
            </div>
          </div>
        </nav>

        {/* Main Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-20 pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text and CTA */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full border border-white/20 mb-6">
                <span className="text-yellow-400">⭐</span>
                <span className="text-white/90 text-sm">Trusted by 50,000+ travelers</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Plan Your
                <span className="bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent"> Dream Trip</span>
                <br />Together
              </h1>
              
              <p className="text-xl text-white/80 mb-8 leading-relaxed">
                The smartest way to plan group travel. Collaborate in real-time, 
                discover amazing places, and create unforgettable memories with friends and family.
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white/90">Free to use</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white/90">Real-time sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white/90">AI-powered</span>
                </div>
              </div>

              {/* Join Trip Section - Prominent on Homepage */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="text-2xl">🎫</span>
                  Have a Trip Code? Join Instantly!
                </h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={shareCode}
                    onChange={(e) => setShareCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinTrip()}
                    placeholder="Enter trip code (e.g. hawaii2025)"
                    className="flex-1 px-4 py-3 bg-white/90 backdrop-blur rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <button
                    onClick={handleJoinTrip}
                    className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-105 shadow-lg"
                  >
                    Join Trip
                  </button>
                </div>
                {joinError && (
                  <p className="text-red-400 text-sm mt-2">{joinError}</p>
                )}
              </div>

              {/* Quick Destination Cards */}
              <div className="mb-8">
                <p className="text-white/60 text-sm mb-3">Popular destinations</p>
                <div className="grid grid-cols-3 gap-3">
                  {destinations.map((dest, index) => (
                    <button
                      key={index}
                      onClick={() => handleDestinationClick(dest.city)}
                      className="group relative bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 hover:bg-white/20 transition-all"
                    >
                      <div className="text-3xl mb-1">{dest.image}</div>
                      <div className="text-white font-medium text-sm">{dest.city}</div>
                      <div className="text-white/60 text-xs">{dest.tag}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Your Adventure</h2>
                <p className="text-gray-600">Fill in the details to create your trip</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trip Name
                  </label>
                  <input
                    type="text"
                    value={formData.tripName}
                    onChange={(e) => setFormData({...formData, tripName: e.target.value})}
                    placeholder="e.g. Summer in Europe, Bali Retreat"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({...formData, destination: e.target.value})}
                    placeholder="Where are you going?"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
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
                          endDate: formData.endDate && formData.endDate < newStartDate ? '' : formData.endDate
                        })
                      }}
                      min={today}
                      placeholder="Select date"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                      placeholder="Select date"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Size
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1,2,3,4,5,6,7,8,9,'10+'].map((n, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const size = n === '10+' ? 10 : n as number
                          setFormData({...formData, groupSize: size})
                        }}
                        className={`py-3 px-3 rounded-xl border-2 transition-all font-medium ${
                          formData.groupSize === (n === '10+' ? 10 : n)
                            ? 'border-purple-600 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg transform scale-105'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-purple-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {formData.groupSize === 1 ? 'Solo adventure' : `${formData.groupSize} travelers`}
                  </p>
                </div>

                {/* Custom Trip Code Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Trip Code (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomCode(!useCustomCode)
                        setCustomCode('')
                        setCodeAvailable(null)
                      }}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      {useCustomCode ? 'Use Auto-Generated' : 'Choose My Own'}
                    </button>
                  </div>
                  
                  {useCustomCode ? (
                    <div>
                      <input
                        type="text"
                        value={customCode}
                        onChange={(e) => {
                          const code = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                          setCustomCode(code)
                          if (code.length >= 4) {
                            checkCodeAvailability(code)
                          } else {
                            setCodeAvailable(null)
                          }
                        }}
                        placeholder="e.g. hawaii2025, johns-bachelor"
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                          codeAvailable === false ? 'border-red-400 bg-red-50' : 
                          codeAvailable === true ? 'border-green-400 bg-green-50' : 
                          'border-gray-200'
                        }`}
                        maxLength={30}
                      />
                      <div className="mt-2 text-xs">
                        {checkingCode && (
                          <span className="text-gray-500">Checking availability...</span>
                        )}
                        {!checkingCode && codeAvailable === true && customCode.length >= 4 && (
                          <span className="text-green-600">✓ This code is available!</span>
                        )}
                        {!checkingCode && codeAvailable === false && (
                          <span className="text-red-600">✗ This code is already taken</span>
                        )}
                        {customCode.length > 0 && customCode.length < 4 && (
                          <span className="text-gray-500">Code must be at least 4 characters</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose a memorable code that friends can easily type
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-xl">
                      <p className="text-sm text-gray-600">
                        A unique code will be generated automatically
                      </p>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] shadow-lg"
                >
                  Create My Trip
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Perfect Group Travel
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features designed to make trip planning effortless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-purple-300 to-transparent"></div>
                )}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-3xl font-bold rounded-2xl mb-4 shadow-lg">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by Travelers Worldwide
            </h2>
            <p className="text-xl text-gray-600">
              See what our users have to say
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">{testimonial.avatar}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl">⭐</span>
                  ))}
                </div>
                <p className="text-gray-700 italic">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">✈️</span>
                <span className="text-2xl font-bold">Pathfind</span>
              </div>
              <p className="text-gray-400">
                Making group travel planning simple and enjoyable.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mobile App</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Facebook</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Pathfind. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Join Trip Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full mb-4">
                <span className="text-2xl">🎫</span>
              </div>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-xl font-mono uppercase"
                  maxLength={8}
                />
                {joinError && (
                  <p className="text-red-500 text-sm mt-2">{joinError}</p>
                )}
              </div>

              <button
                onClick={handleJoinTrip}
                disabled={!shareCode.trim()}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
                  shareCode.trim() 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg' 
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
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
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all"
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

      {/* Subscription Upgrade Modal */}
      {showUpgradeModal && tripLimitError && (
        <SubscriptionUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false)
            setTripLimitError(null)
          }}
          currentCount={tripLimitError.currentCount || 5}
          maxTrips={tripLimitError.maxTrips || 5}
          subscriptionType={tripLimitError.subscriptionType || 'free'}
        />
      )}
    </>
  )
}