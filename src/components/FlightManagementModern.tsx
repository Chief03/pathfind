'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import { parseFlightNumber, lookupFlight } from '@/lib/flightLookup'
import { useActivityTracker } from '@/contexts/ActivityTracker'

interface Flight {
  id: string
  tripId: string
  userId: string
  airline: string
  flightNumber?: string
  arrivalDateTime: string
  departureAirport: string
  arrivalAirport: string
  travelerName: string
  confirmationNumber?: string
  seatNumber?: string
  terminal?: string
  gate?: string
  notes?: string
  status?: string
  isGroupFlight?: boolean
  guestUserIds?: string[]
  createdAt?: string
  updatedAt?: string
}

interface Passenger {
  id: string
  name: string
  email?: string
  isOwner?: boolean
  seatNumber?: string
}

interface FlightManagementProps {
  tripId: string
  tripData?: any
  onFlightsUpdate?: (flights: Flight[]) => void
}

export default function FlightManagementModern({ tripId, tripData, onFlightsUpdate }: FlightManagementProps) {
  const { addActivity } = useActivityTracker()
  const [flights, setFlights] = useState<Flight[]>([])
  const [isAddingFlight, setIsAddingFlight] = useState(false)
  const [editingFlight, setEditingFlight] = useState<string | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [loading, setLoading] = useState(true)
  const [searchingFlight, setSearchingFlight] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'cards'>('cards')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  
  // Form state for new/edit flight
  const [flightForm, setFlightForm] = useState({
    airline: '',
    flightNumber: '',
    arrivalDateTime: '',
    departureAirport: '',
    arrivalAirport: '',
    travelerName: '',
    confirmationNumber: '',
    seatNumber: '',
    terminal: '',
    gate: '',
    notes: '',
    isGroupFlight: false
  })

  // Mock passengers for the trip
  useEffect(() => {
    const mockPassengers: Passenger[] = [
      { id: '1', name: 'You', isOwner: true },
      { id: '2', name: 'Friend 1' },
      { id: '3', name: 'Friend 2' }
    ]
    
    if (tripData?.groupSize) {
      const additionalPassengers = Array.from({ length: Math.max(0, tripData.groupSize - 3) }, (_, i) => ({
        id: `${4 + i}`,
        name: `Traveler ${4 + i}`
      }))
      setPassengers([...mockPassengers, ...additionalPassengers].slice(0, tripData.groupSize))
    } else {
      setPassengers(mockPassengers)
    }
  }, [tripData])

  // Load flights
  useEffect(() => {
    loadFlights()
  }, [tripId])

  const loadFlights = async () => {
    try {
      setLoading(true)
      // Mock data for demo
      const mockFlights: Flight[] = []
      setFlights(mockFlights)
    } catch (error) {
      console.error('Error loading flights:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFlightLookup = async () => {
    if (!flightForm.flightNumber) return
    
    setSearchingFlight(true)
    try {
      const flightInfo = await lookupFlight(
        flightForm.flightNumber,
        flightForm.arrivalDateTime || new Date().toISOString().split('T')[0]
      )
      
      if (flightInfo) {
        setFlightForm(prev => ({
          ...prev,
          airline: flightInfo.airline || prev.airline,
          departureAirport: flightInfo.departureAirport?.match(/\(([A-Z]{3})\)/)?.[1] || prev.departureAirport,
          arrivalAirport: flightInfo.arrivalAirport?.match(/\(([A-Z]{3})\)/)?.[1] || prev.arrivalAirport,
        }))
      }
    } catch (error) {
      console.error('Error looking up flight:', error)
    } finally {
      setSearchingFlight(false)
    }
  }

  const handleSaveFlight = async () => {
    try {
      // Validate required fields
      if (!flightForm.airline || !flightForm.arrivalDateTime || 
          !flightForm.departureAirport || !flightForm.arrivalAirport || !flightForm.travelerName) {
        alert('Please fill in all required fields')
        return
      }

      const flightData = {
        ...flightForm,
        tripId,
        userId: 'current-user-id',
        departureAirport: flightForm.departureAirport.toUpperCase(),
        arrivalAirport: flightForm.arrivalAirport.toUpperCase(),
        flightNumber: flightForm.flightNumber?.toUpperCase(),
        status: 'scheduled'
      }

      if (editingFlight) {
        const updatedFlight = { ...flightData, id: editingFlight }
        setFlights(prev => prev.map(f => f.id === editingFlight ? updatedFlight : f))
        
        addActivity({
          type: 'update',
          category: 'flight',
          action: `Updated flight ${flightData.flightNumber || flightData.airline}`,
          details: { route: `${flightData.departureAirport} → ${flightData.arrivalAirport}` }
        })
      } else {
        const newFlight = {
          ...flightData,
          id: `flight_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setFlights(prev => [...prev, newFlight])
        
        addActivity({
          type: 'create',
          category: 'flight',
          action: `Added flight ${flightData.flightNumber || flightData.airline}`,
          details: { route: `${flightData.departureAirport} → ${flightData.arrivalAirport}` }
        })
      }

      // Reset form
      setFlightForm({
        airline: '',
        flightNumber: '',
        arrivalDateTime: '',
        departureAirport: '',
        arrivalAirport: '',
        travelerName: '',
        confirmationNumber: '',
        seatNumber: '',
        terminal: '',
        gate: '',
        notes: '',
        isGroupFlight: false
      })
      setIsAddingFlight(false)
      setEditingFlight(null)
      
      if (onFlightsUpdate) {
        onFlightsUpdate(flights)
      }
    } catch (error) {
      console.error('Error saving flight:', error)
    }
  }

  const handleDeleteFlight = async (flightId: string) => {
    try {
      const flight = flights.find(f => f.id === flightId)
      setFlights(prev => prev.filter(f => f.id !== flightId))
      
      if (flight) {
        addActivity({
          type: 'delete',
          category: 'flight',
          action: `Deleted flight ${flight.flightNumber || flight.airline}`,
          details: { route: `${flight.departureAirport} → ${flight.arrivalAirport}` }
        })
      }
      
      if (onFlightsUpdate) {
        onFlightsUpdate(flights.filter(f => f.id !== flightId))
      }
    } catch (error) {
      console.error('Error deleting flight:', error)
    }
  }

  const handleEditFlight = (flight: Flight) => {
    setFlightForm({
      airline: flight.airline,
      flightNumber: flight.flightNumber || '',
      arrivalDateTime: flight.arrivalDateTime,
      departureAirport: flight.departureAirport,
      arrivalAirport: flight.arrivalAirport,
      travelerName: flight.travelerName,
      confirmationNumber: flight.confirmationNumber || '',
      seatNumber: flight.seatNumber || '',
      terminal: flight.terminal || '',
      gate: flight.gate || '',
      notes: flight.notes || '',
      isGroupFlight: flight.isGroupFlight || false
    })
    setEditingFlight(flight.id)
    setIsAddingFlight(true)
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' })
    }
  }

  const getTimeUntilFlight = (dateTime: string) => {
    const flightTime = new Date(dateTime).getTime()
    const now = new Date().getTime()
    const diff = flightTime - now
    
    if (diff < 0) return 'Past'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <span className="text-4xl">✈️</span>
            Flight Hub
          </h2>
          <p className="text-white/60 text-sm mt-1">
            Manage all your trip flights in one place
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-1 flex">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'timeline'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Timeline
            </button>
          </div>
          <button
            onClick={() => setIsAddingFlight(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-xl hover:shadow-2xl"
          >
            <span className="mr-2">+</span> Add Flight
          </button>
        </div>
      </div>

      {/* Add/Edit Flight Modal */}
      {isAddingFlight && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {editingFlight ? '✏️ Edit Flight' : '✈️ Add New Flight'}
              </h3>
              <button
                onClick={() => {
                  setIsAddingFlight(false)
                  setEditingFlight(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Flight Lookup Section */}
              <div className="md:col-span-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quick Flight Lookup (Optional)
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter flight number (e.g., AA1234)"
                    value={flightForm.flightNumber}
                    onChange={(e) => setFlightForm({ ...flightForm, flightNumber: e.target.value })}
                    className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                  <button
                    onClick={handleFlightLookup}
                    disabled={!flightForm.flightNumber || searchingFlight}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                      searchingFlight || !flightForm.flightNumber
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-105 shadow-lg'
                    }`}
                  >
                    {searchingFlight ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span> Searching...
                      </span>
                    ) : (
                      '🔍 Lookup'
                    )}
                  </button>
                </div>
              </div>

              {/* Flight Details Grid */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Airline *</label>
                <input
                  type="text"
                  placeholder="e.g., Delta Airlines"
                  value={flightForm.airline}
                  onChange={(e) => setFlightForm({ ...flightForm, airline: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Traveler *</label>
                <select
                  value={flightForm.travelerName}
                  onChange={(e) => setFlightForm({ ...flightForm, travelerName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  required
                >
                  <option value="">Select traveler</option>
                  {passengers.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">From (Airport Code) *</label>
                <input
                  type="text"
                  placeholder="JFK"
                  value={flightForm.departureAirport}
                  onChange={(e) => setFlightForm({ ...flightForm, departureAirport: e.target.value.toUpperCase() })}
                  maxLength={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all uppercase font-mono text-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">To (Airport Code) *</label>
                <input
                  type="text"
                  placeholder="LAX"
                  value={flightForm.arrivalAirport}
                  onChange={(e) => setFlightForm({ ...flightForm, arrivalAirport: e.target.value.toUpperCase() })}
                  maxLength={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all uppercase font-mono text-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Departure Date & Time *</label>
                <input
                  type="datetime-local"
                  value={flightForm.arrivalDateTime}
                  onChange={(e) => setFlightForm({ ...flightForm, arrivalDateTime: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Confirmation #</label>
                <input
                  type="text"
                  placeholder="ABC123"
                  value={flightForm.confirmationNumber}
                  onChange={(e) => setFlightForm({ ...flightForm, confirmationNumber: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Terminal</label>
                  <input
                    type="text"
                    placeholder="2"
                    value={flightForm.terminal}
                    onChange={(e) => setFlightForm({ ...flightForm, terminal: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Gate</label>
                  <input
                    type="text"
                    placeholder="B14"
                    value={flightForm.gate}
                    onChange={(e) => setFlightForm({ ...flightForm, gate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Seat</label>
                  <input
                    type="text"
                    placeholder="12A"
                    value={flightForm.seatNumber}
                    onChange={(e) => setFlightForm({ ...flightForm, seatNumber: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="groupFlight"
                  checked={flightForm.isGroupFlight}
                  onChange={(e) => setFlightForm({ ...flightForm, isGroupFlight: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="groupFlight" className="font-medium text-gray-700">
                  Group flight (multiple travelers)
                </label>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-gray-700">Notes</label>
                <textarea
                  placeholder="Add any additional notes..."
                  value={flightForm.notes}
                  onChange={(e) => setFlightForm({ ...flightForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleSaveFlight}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:scale-[1.02] transition-all shadow-lg"
              >
                {editingFlight ? '💾 Update Flight' : '✈️ Save Flight'}
              </button>
              <button
                onClick={() => {
                  setIsAddingFlight(false)
                  setEditingFlight(null)
                }}
                className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flights Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-200 rounded-full animate-pulse"></div>
            <div className="w-20 h-20 border-4 border-purple-600 rounded-full animate-spin border-t-transparent absolute top-0"></div>
          </div>
          <p className="mt-4 text-white/60 animate-pulse">Loading your flights...</p>
        </div>
      ) : flights.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-16 text-center border border-white/20">
          <div className="inline-block p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full mb-6">
            <span className="text-6xl">✈️</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No Flights Yet</h3>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Start building your travel itinerary by adding your first flight
          </p>
          <button
            onClick={() => setIsAddingFlight(true)}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-xl text-lg"
          >
            ✈️ Add Your First Flight
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-6 md:grid-cols-2">
          {flights.map((flight) => {
            const dateTime = formatDateTime(flight.arrivalDateTime)
            const timeUntil = getTimeUntilFlight(flight.arrivalDateTime)
            const isExpanded = expandedCard === flight.id
            
            return (
              <div
                key={flight.id}
                className="group relative bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
                onClick={() => setExpandedCard(isExpanded ? null : flight.id)}
              >
                {/* Time Until Badge */}
                <div className="absolute -top-3 -right-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-bold shadow-lg">
                  {timeUntil}
                </div>

                {/* Flight Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-2xl">
                      <span className="text-3xl">✈️</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">
                        {flight.flightNumber || flight.airline}
                      </h4>
                      <p className="text-white/60 text-sm">{flight.airline}</p>
                    </div>
                  </div>
                  {flight.isGroupFlight && (
                    <span className="px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-300 rounded-full text-xs font-semibold">
                      GROUP
                    </span>
                  )}
                </div>

                {/* Route Visualization */}
                <div className="bg-white/5 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">{flight.departureAirport}</p>
                      <p className="text-xs text-white/50 mt-1">Departure</p>
                    </div>
                    <div className="flex-1 px-4">
                      <div className="relative">
                        <div className="h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 rounded-full"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="bg-white/10 backdrop-blur px-2 py-1 rounded-lg">
                            <span className="text-2xl">✈️</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">{flight.arrivalAirport}</p>
                      <p className="text-xs text-white/50 mt-1">Arrival</p>
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-center justify-center gap-4 text-white/80 mb-4">
                  <span className="flex items-center gap-1">
                    <span>📅</span>
                    <span className="font-semibold">{dateTime.dayOfWeek}, {dateTime.date}</span>
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="flex items-center gap-1">
                    <span>🕐</span>
                    <span>{dateTime.time}</span>
                  </span>
                </div>

                {/* Traveler Info */}
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-3 mb-4">
                  <p className="text-white/60 text-xs mb-1">Traveler</p>
                  <p className="text-white font-semibold">{flight.travelerName}</p>
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div className="space-y-3 animate-in slide-in-from-top duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      {flight.confirmationNumber && (
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-white/60 text-xs mb-1">Confirmation</p>
                          <p className="text-white font-mono font-semibold">{flight.confirmationNumber}</p>
                        </div>
                      )}
                      {flight.seatNumber && (
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-white/60 text-xs mb-1">Seat</p>
                          <p className="text-white font-semibold">{flight.seatNumber}</p>
                        </div>
                      )}
                      {flight.terminal && (
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-white/60 text-xs mb-1">Terminal</p>
                          <p className="text-white font-semibold">{flight.terminal}</p>
                        </div>
                      )}
                      {flight.gate && (
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-white/60 text-xs mb-1">Gate</p>
                          <p className="text-white font-semibold">{flight.gate}</p>
                        </div>
                      )}
                    </div>
                    
                    {flight.notes && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <p className="text-blue-300 text-sm">📝 {flight.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditFlight(flight)
                    }}
                    className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this flight?')) {
                        handleDeleteFlight(flight.id)
                      }
                    }}
                    className="flex-1 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Timeline View
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-400 via-pink-400 to-purple-400"></div>
          <div className="space-y-8">
            {flights.sort((a, b) => new Date(a.arrivalDateTime).getTime() - new Date(b.arrivalDateTime).getTime()).map((flight, index) => {
              const dateTime = formatDateTime(flight.arrivalDateTime)
              
              return (
                <div key={flight.id} className="relative flex items-center gap-6 group">
                  <div className="absolute left-6 w-4 h-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full border-4 border-purple-900 z-10"></div>
                  <div className="ml-20 flex-1 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-[1.01]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">✈️</span>
                        <div>
                          <h4 className="text-lg font-bold text-white">{flight.flightNumber || flight.airline}</h4>
                          <p className="text-white/60 text-sm">{dateTime.dayOfWeek}, {dateTime.date} at {dateTime.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-white">
                        <span className="font-bold">{flight.departureAirport}</span>
                        <span>→</span>
                        <span className="font-bold">{flight.arrivalAirport}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-white/80">Traveler: {flight.travelerName}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditFlight(flight)}
                          className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this flight?')) {
                              handleDeleteFlight(flight.id)
                            }
                          }}
                          className="p-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}