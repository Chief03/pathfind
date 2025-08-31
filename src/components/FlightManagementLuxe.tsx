'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import { fetchUserAttributes } from 'aws-amplify/auth'
import { parseFlightNumber, lookupFlight } from '../lib/flightLookup'

interface FlightManagementLuxeProps {
  tripData: any
  flights?: any[]
  onFlightsUpdate?: (flights: any[]) => void
}

export default function FlightManagementLuxe({ 
  tripData, 
  flights: initialFlights = [], 
  onFlightsUpdate 
}: FlightManagementLuxeProps) {
  const [flights, setFlights] = useState(initialFlights)
  const [showAddFlight, setShowAddFlight] = useState(false)
  const [expandedFlight, setExpandedFlight] = useState<string | null>(null)
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null)
  const [userNickname, setUserNickname] = useState<string>('')
  const [savingFlight, setSavingFlight] = useState(false)
  const [newFlight, setNewFlight] = useState({
    arrivalAirport: '',
    arrivalTime: '',
    departureAirport: '',
    departureTime: '',
    airline: '',
    flightNumber: '',
    direction: 'departure' as 'arrival' | 'departure',
    confirmationCode: '',
    terminal: '',
    gate: '',
    notes: ''
  })

  useEffect(() => {
    setFlights(initialFlights)
  }, [initialFlights])

  useEffect(() => {
    fetchUserNickname()
    if (tripData?.id) {
      loadFlights()
    }
  }, [tripData])

  const fetchUserNickname = async () => {
    try {
      const attributes = await fetchUserAttributes()
      setUserNickname(attributes.given_name || attributes.email || 'User')
    } catch (error) {
      console.error('Error fetching user attributes:', error)
      setUserNickname('User')
    }
  }

  const loadFlights = async () => {
    if (!tripData?.id) return
    
    try {
      const client = generateClient() as any
      const flightData = await client.models.Flight.list({
        filter: { tripId: { eq: tripData.id } }
      })
      const sortedFlights = (flightData.data || []).sort((a: any, b: any) => 
        new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
      )
      setFlights(sortedFlights)
      if (onFlightsUpdate) {
        onFlightsUpdate(sortedFlights)
      }
    } catch (error) {
      console.error('Error loading flights:', error)
    }
  }

  const handleFlightLookup = async () => {
    if (newFlight.airline && newFlight.flightNumber) {
      const flightData = await lookupFlight(newFlight.airline, newFlight.flightNumber)
      if (flightData) {
        setNewFlight(prev => ({
          ...prev,
          ...flightData,
          direction: prev.direction
        }))
      }
    }
  }

  const handleSaveFlight = async () => {
    if (!tripData?.id) return
    setSavingFlight(true)

    try {
      const client = generateClient() as any
      const flightData = {
        tripId: tripData.id,
        airline: newFlight.airline,
        flightNumber: newFlight.flightNumber,
        departureAirport: JSON.stringify({
          code: newFlight.departureAirport,
          name: newFlight.departureAirport
        }),
        arrivalAirport: JSON.stringify({
          code: newFlight.arrivalAirport,
          name: newFlight.arrivalAirport
        }),
        departureTime: new Date(newFlight.departureTime).toISOString(),
        arrivalTime: new Date(newFlight.arrivalTime).toISOString(),
        direction: newFlight.direction,
        terminal: newFlight.terminal,
        gate: newFlight.gate,
        confirmationCode: newFlight.confirmationCode,
        notes: newFlight.notes,
        addedByUserId: userNickname,
        addedByUserName: userNickname
      }

      const { data: savedFlight } = await client.models.Flight.create(flightData)
      
      if (savedFlight) {
        await loadFlights()
        setShowAddFlight(false)
        setNewFlight({
          arrivalAirport: '',
          arrivalTime: '',
          departureAirport: '',
          departureTime: '',
          airline: '',
          flightNumber: '',
          direction: 'departure',
          confirmationCode: '',
          terminal: '',
          gate: '',
          notes: ''
        })
      }
    } catch (error) {
      console.error('Error saving flight:', error)
    } finally {
      setSavingFlight(false)
    }
  }

  const handleDeleteFlight = async (flightId: string) => {
    try {
      const client = generateClient() as any
      await client.models.Flight.delete({ id: flightId })
      await loadFlights()
    } catch (error) {
      console.error('Error deleting flight:', error)
    }
  }

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    }
  }

  const getFlightDuration = (departure: string, arrival: string) => {
    const dep = new Date(departure)
    const arr = new Date(arrival)
    const diff = arr.getTime() - dep.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="space-y-8">
      {/* Elegant Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900 via-blue-900 to-indigo-900 rounded-3xl opacity-95"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500 rounded-full filter blur-3xl opacity-20"></div>
        
        <div className="relative p-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-light text-white tracking-tight mb-2">Flight Itinerary</h1>
              <p className="text-white/70 font-light">Manage your travel arrangements</p>
            </div>
            <button
              onClick={() => setShowAddFlight(true)}
              className="px-6 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-2xl hover:bg-white/20 transition-all flex items-center gap-3 group"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-white font-light">Add Flight</span>
            </button>
          </div>
          
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
              <p className="text-3xl font-light text-white">{flights.length}</p>
              <p className="text-white/60 text-sm font-light">Total Flights</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
              <p className="text-3xl font-light text-white">
                {flights.filter(f => f.direction === 'departure').length}
              </p>
              <p className="text-white/60 text-sm font-light">Departures</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
              <p className="text-3xl font-light text-white">
                {flights.filter(f => f.direction === 'arrival').length}
              </p>
              <p className="text-white/60 text-sm font-light">Arrivals</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
              <p className="text-3xl font-light text-white">
                {flights.filter(f => f.confirmationCode).length}
              </p>
              <p className="text-white/60 text-sm font-light">Confirmed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Flights List */}
      <div className="space-y-4">
        {flights.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-2">No flights added yet</h3>
            <p className="text-gray-500 font-light mb-6">Start by adding your flight details</p>
            <button
              onClick={() => setShowAddFlight(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-600 text-white rounded-xl hover:shadow-lg transition-all"
            >
              Add Your First Flight
            </button>
          </div>
        ) : (
          flights.map((flight) => {
            const departure = formatDateTime(flight.departureTime)
            const arrival = formatDateTime(flight.arrivalTime)
            const depAirport = JSON.parse(flight.departureAirport)
            const arrAirport = JSON.parse(flight.arrivalAirport)
            const isExpanded = expandedFlight === flight.id

            return (
              <div
                key={flight.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden"
              >
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedFlight(isExpanded ? null : flight.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                      {/* Flight Number Badge */}
                      <div className="text-center">
                        <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl">
                          <p className="text-xs text-gray-500 font-medium">{flight.airline}</p>
                          <p className="text-lg font-semibold text-gray-900">{flight.flightNumber}</p>
                        </div>
                        {flight.direction && (
                          <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${
                            flight.direction === 'departure' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {flight.direction}
                          </span>
                        )}
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-2xl font-light text-gray-900">{depAirport.code}</p>
                          <p className="text-sm text-gray-500">{departure.time}</p>
                          <p className="text-xs text-gray-400">{departure.date}</p>
                        </div>
                        
                        <div className="flex flex-col items-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                              d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span className="text-xs text-gray-500 mt-1">
                            {getFlightDuration(flight.departureTime, flight.arrivalTime)}
                          </span>
                        </div>
                        
                        <div>
                          <p className="text-2xl font-light text-gray-900">{arrAirport.code}</p>
                          <p className="text-sm text-gray-500">{arrival.time}</p>
                          <p className="text-xs text-gray-400">{arrival.date}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {flight.confirmationCode && (
                        <div className="px-3 py-1 bg-green-50 rounded-lg">
                          <p className="text-xs text-gray-500">Confirmation</p>
                          <p className="text-sm font-mono font-semibold text-green-700">
                            {flight.confirmationCode}
                          </p>
                        </div>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteFlight(flight.id)
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                      >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-0 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {flight.terminal && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-1">Terminal</p>
                          <p className="text-lg font-light text-gray-900">{flight.terminal}</p>
                        </div>
                      )}
                      {flight.gate && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-1">Gate</p>
                          <p className="text-lg font-light text-gray-900">{flight.gate}</p>
                        </div>
                      )}
                      {flight.addedByUserName && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-1">Added by</p>
                          <p className="text-lg font-light text-gray-900">{flight.addedByUserName}</p>
                        </div>
                      )}
                    </div>
                    {flight.notes && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Notes</p>
                        <p className="text-sm text-gray-700">{flight.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add Flight Modal */}
      {showAddFlight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light text-gray-900">Add Flight Details</h2>
              <button
                onClick={() => setShowAddFlight(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Flight Type */}
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Flight Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewFlight({ ...newFlight, direction: 'departure' })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      newFlight.direction === 'departure'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg mb-1">🛫</span>
                    <p className="text-sm font-medium">Departure</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFlight({ ...newFlight, direction: 'arrival' })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      newFlight.direction === 'arrival'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg mb-1">🛬</span>
                    <p className="text-sm font-medium">Arrival</p>
                  </button>
                </div>
              </div>

              {/* Flight Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Airline</label>
                  <input
                    type="text"
                    value={newFlight.airline}
                    onChange={(e) => setNewFlight({ ...newFlight, airline: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., United"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Flight Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFlight.flightNumber}
                      onChange={(e) => setNewFlight({ ...newFlight, flightNumber: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 1234"
                    />
                    <button
                      onClick={handleFlightLookup}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Lookup
                    </button>
                  </div>
                </div>
              </div>

              {/* Airports */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Departure Airport</label>
                  <input
                    type="text"
                    value={newFlight.departureAirport}
                    onChange={(e) => setNewFlight({ ...newFlight, departureAirport: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., LAX"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Arrival Airport</label>
                  <input
                    type="text"
                    value={newFlight.arrivalAirport}
                    onChange={(e) => setNewFlight({ ...newFlight, arrivalAirport: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., JFK"
                  />
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Departure Time</label>
                  <input
                    type="datetime-local"
                    value={newFlight.departureTime}
                    onChange={(e) => setNewFlight({ ...newFlight, departureTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Arrival Time</label>
                  <input
                    type="datetime-local"
                    value={newFlight.arrivalTime}
                    onChange={(e) => setNewFlight({ ...newFlight, arrivalTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Terminal</label>
                  <input
                    type="text"
                    value={newFlight.terminal}
                    onChange={(e) => setNewFlight({ ...newFlight, terminal: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Gate</label>
                  <input
                    type="text"
                    value={newFlight.gate}
                    onChange={(e) => setNewFlight({ ...newFlight, gate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., B24"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Confirmation Code</label>
                  <input
                    type="text"
                    value={newFlight.confirmationCode}
                    onChange={(e) => setNewFlight({ ...newFlight, confirmationCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., ABC123"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Notes</label>
                <textarea
                  value={newFlight.notes}
                  onChange={(e) => setNewFlight({ ...newFlight, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveFlight}
                  disabled={savingFlight || !newFlight.airline || !newFlight.flightNumber}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {savingFlight ? 'Saving...' : 'Save Flight'}
                </button>
                <button
                  onClick={() => setShowAddFlight(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}