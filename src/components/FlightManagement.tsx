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

export default function FlightManagement({ tripId, tripData, onFlightsUpdate }: FlightManagementProps) {
  const { addActivity } = useActivityTracker()
  const [flights, setFlights] = useState<Flight[]>([])
  const [isAddingFlight, setIsAddingFlight] = useState(false)
  const [editingFlight, setEditingFlight] = useState<string | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [loading, setLoading] = useState(true)
  const [searchingFlight, setSearchingFlight] = useState(false)
  
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

  // Passenger assignment state
  const [passengerForm, setPassengerForm] = useState({
    name: '',
    email: '',
    seatNumber: ''
  })

  // Mock passengers for the trip (would come from trip members in real app)
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
      // In real app, this would fetch from database
      // const client = generateClient() as any
      // const { data } = await client.models.Flight.list({ filter: { tripId: { eq: tripId } } })
      
      // Mock data for now
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
      const client = generateClient() as any
      
      // Validate required fields
      if (!flightForm.airline || !flightForm.arrivalDateTime || 
          !flightForm.departureAirport || !flightForm.arrivalAirport || !flightForm.travelerName) {
        alert('Please fill in all required fields')
        return
      }

      const flightData = {
        ...flightForm,
        tripId,
        userId: 'current-user-id', // Would get from auth context
        departureAirport: flightForm.departureAirport.toUpperCase(),
        arrivalAirport: flightForm.arrivalAirport.toUpperCase(),
        flightNumber: flightForm.flightNumber?.toUpperCase(),
        status: 'scheduled'
      }

      if (editingFlight) {
        // Update existing flight
        const updatedFlight = { ...flightData, id: editingFlight }
        setFlights(prev => prev.map(f => f.id === editingFlight ? updatedFlight : f))
        
        addActivity({
          type: 'update',
          category: 'flight',
          action: `Updated flight ${flightData.flightNumber || flightData.airline}`,
          details: { route: `${flightData.departureAirport} → ${flightData.arrivalAirport}` }
        })
      } else {
        // Create new flight
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

  const handleAssignPassenger = (flight: Flight, passenger: Passenger) => {
    const updatedFlight = {
      ...flight,
      guestUserIds: [...(flight.guestUserIds || []), passenger.id]
    }
    setFlights(prev => prev.map(f => f.id === flight.id ? updatedFlight : f))
    setSelectedFlight(null)
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ✈️ Flight Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Track and manage all flights for your trip
          </p>
        </div>
        <button
          onClick={() => setIsAddingFlight(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg"
        >
          + Add Flight
        </button>
      </div>

      {/* Add/Edit Flight Form */}
      {isAddingFlight && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>✈️</span>
            {editingFlight ? 'Edit Flight' : 'Add New Flight'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Flight Number with Lookup */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Flight Number (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., AA1234"
                  value={flightForm.flightNumber}
                  onChange={(e) => setFlightForm({ ...flightForm, flightNumber: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleFlightLookup}
                  disabled={!flightForm.flightNumber || searchingFlight}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searchingFlight ? '🔍 Searching...' : '🔍 Lookup'}
                </button>
              </div>
            </div>

            {/* Airline */}
            <div>
              <label className="block text-sm font-medium mb-1">Airline *</label>
              <input
                type="text"
                placeholder="e.g., American Airlines"
                value={flightForm.airline}
                onChange={(e) => setFlightForm({ ...flightForm, airline: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Traveler Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Traveler Name *</label>
              <select
                value={flightForm.travelerName}
                onChange={(e) => setFlightForm({ ...flightForm, travelerName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Select traveler</option>
                {passengers.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Departure Airport */}
            <div>
              <label className="block text-sm font-medium mb-1">Departure Airport (IATA) *</label>
              <input
                type="text"
                placeholder="e.g., JFK"
                value={flightForm.departureAirport}
                onChange={(e) => setFlightForm({ ...flightForm, departureAirport: e.target.value.toUpperCase() })}
                maxLength={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500 uppercase"
                required
              />
            </div>

            {/* Arrival Airport */}
            <div>
              <label className="block text-sm font-medium mb-1">Arrival Airport (IATA) *</label>
              <input
                type="text"
                placeholder="e.g., LAX"
                value={flightForm.arrivalAirport}
                onChange={(e) => setFlightForm({ ...flightForm, arrivalAirport: e.target.value.toUpperCase() })}
                maxLength={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500 uppercase"
                required
              />
            </div>

            {/* Arrival Date/Time */}
            <div>
              <label className="block text-sm font-medium mb-1">Arrival Date & Time *</label>
              <input
                type="datetime-local"
                value={flightForm.arrivalDateTime}
                onChange={(e) => setFlightForm({ ...flightForm, arrivalDateTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Confirmation Number */}
            <div>
              <label className="block text-sm font-medium mb-1">Confirmation Number</label>
              <input
                type="text"
                placeholder="e.g., ABC123"
                value={flightForm.confirmationNumber}
                onChange={(e) => setFlightForm({ ...flightForm, confirmationNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Terminal */}
            <div>
              <label className="block text-sm font-medium mb-1">Terminal</label>
              <input
                type="text"
                placeholder="e.g., Terminal 2"
                value={flightForm.terminal}
                onChange={(e) => setFlightForm({ ...flightForm, terminal: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Gate */}
            <div>
              <label className="block text-sm font-medium mb-1">Gate</label>
              <input
                type="text"
                placeholder="e.g., B14"
                value={flightForm.gate}
                onChange={(e) => setFlightForm({ ...flightForm, gate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Seat Number */}
            <div>
              <label className="block text-sm font-medium mb-1">Seat Number</label>
              <input
                type="text"
                placeholder="e.g., 12A"
                value={flightForm.seatNumber}
                onChange={(e) => setFlightForm({ ...flightForm, seatNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Group Flight Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="groupFlight"
                checked={flightForm.isGroupFlight}
                onChange={(e) => setFlightForm({ ...flightForm, isGroupFlight: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="groupFlight" className="text-sm font-medium">
                Multiple travelers on this flight
              </label>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                placeholder="Additional information..."
                value={flightForm.notes}
                onChange={(e) => setFlightForm({ ...flightForm, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSaveFlight}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-transform"
            >
              {editingFlight ? 'Update Flight' : 'Save Flight'}
            </button>
            <button
              onClick={() => {
                setIsAddingFlight(false)
                setEditingFlight(null)
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
              }}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Flights List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading flights...</p>
        </div>
      ) : flights.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">✈️</div>
          <h3 className="text-xl font-bold mb-2">No Flights Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Add your first flight to get started</p>
          <button
            onClick={() => setIsAddingFlight(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg"
          >
            Add Your First Flight
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {flights.map((flight) => {
            const dateTime = formatDateTime(flight.arrivalDateTime)
            return (
              <div
                key={flight.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Flight Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">✈️</span>
                      <div>
                        <h4 className="text-lg font-bold">
                          {flight.flightNumber || `${flight.airline} Flight`}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {flight.airline}
                        </p>
                      </div>
                      {flight.isGroupFlight && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold">
                          Group Flight
                        </span>
                      )}
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{flight.departureAirport}</p>
                        <p className="text-xs text-gray-500">Departure</p>
                      </div>
                      <div className="flex-1 flex items-center">
                        <div className="flex-1 h-[2px] bg-gradient-to-r from-blue-400 to-purple-400"></div>
                        <span className="mx-2">→</span>
                        <div className="flex-1 h-[2px] bg-gradient-to-r from-purple-400 to-pink-400"></div>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{flight.arrivalAirport}</p>
                        <p className="text-xs text-gray-500">Arrival</p>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center gap-2 mb-3 text-sm">
                      <span>📅</span>
                      <span className="font-semibold">{dateTime.date}</span>
                      <span className="text-gray-400">•</span>
                      <span>🕐</span>
                      <span>{dateTime.time}</span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Traveler</p>
                        <p className="font-semibold text-sm">{flight.travelerName}</p>
                      </div>
                      {flight.seatNumber && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Seat</p>
                          <p className="font-semibold text-sm">{flight.seatNumber}</p>
                        </div>
                      )}
                      {flight.terminal && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Terminal</p>
                          <p className="font-semibold text-sm">{flight.terminal}</p>
                        </div>
                      )}
                      {flight.gate && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Gate</p>
                          <p className="font-semibold text-sm">{flight.gate}</p>
                        </div>
                      )}
                      {flight.confirmationNumber && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Confirmation</p>
                          <p className="font-semibold text-sm">{flight.confirmationNumber}</p>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {flight.notes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          📝 {flight.notes}
                        </p>
                      </div>
                    )}

                    {/* Assigned Passengers */}
                    {flight.isGroupFlight && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold mb-2">Passengers on this flight:</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
                            {flight.travelerName} {flight.seatNumber && `(${flight.seatNumber})`}
                          </span>
                          {flight.guestUserIds?.map(id => {
                            const passenger = passengers.find(p => p.id === id)
                            return passenger ? (
                              <span key={id} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                                {passenger.name} {passenger.seatNumber && `(${passenger.seatNumber})`}
                              </span>
                            ) : null
                          })}
                          <button
                            onClick={() => setSelectedFlight(flight)}
                            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            + Add Passenger
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditFlight(flight)}
                      className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteFlight(flight.id)}
                      className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Passenger Assignment Modal */}
      {selectedFlight && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Add Passenger to Flight</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select a traveler to add to {selectedFlight.flightNumber || 'this flight'}
            </p>
            
            <div className="space-y-2 mb-4">
              {passengers
                .filter(p => !selectedFlight.guestUserIds?.includes(p.id) && p.name !== selectedFlight.travelerName)
                .map(passenger => (
                  <button
                    key={passenger.id}
                    onClick={() => {
                      handleAssignPassenger(selectedFlight, passenger)
                    }}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                  >
                    <p className="font-semibold">{passenger.name}</p>
                    {passenger.email && <p className="text-sm text-gray-500">{passenger.email}</p>}
                  </button>
                ))}
            </div>

            <button
              onClick={() => setSelectedFlight(null)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}