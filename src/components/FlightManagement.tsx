'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
// Removed old mock flight lookup - now using real Amadeus API
import { useActivityTracker } from '@/contexts/ActivityTracker'
import type { Schema } from '../../amplify/data/resource'

// Use the actual Flight type from the GraphQL schema
type Flight = Schema['Flight']['type']

// Extended interface for form state (includes UI-only fields)
interface FlightFormData {
  airline: string
  flightNumber: string
  departureTime: string
  arrivalTime: string
  departureAirport: string
  arrivalAirport: string
  terminal?: string
  gate?: string
  confirmationCode?: string
  notes?: string
  direction?: 'arrival' | 'departure'
  addedByUserName: string
}

interface FlightManagementProps {
  tripId: string
  tripData?: any
  onFlightsUpdate?: (flights: Flight[]) => void
}

export default function FlightManagement({ tripId, tripData, onFlightsUpdate }: FlightManagementProps) {
  const { addActivity } = useActivityTracker()
  const [flights, setFlights] = useState<Flight[]>([])
  
  // Initialize Amplify data client
  const client = generateClient<Schema>()
  const [isAddingFlight, setIsAddingFlight] = useState(false)
  const [editingFlight, setEditingFlight] = useState<string | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchingFlight, setSearchingFlight] = useState(false)
  
  // Form state for new/edit flight
  const [flightForm, setFlightForm] = useState<FlightFormData>({
    airline: '',
    flightNumber: '',
    departureTime: '',
    arrivalTime: '',
    departureAirport: '',
    arrivalAirport: '',
    confirmationCode: '',
    terminal: '',
    gate: '',
    notes: '',
    direction: 'departure',
    addedByUserName: 'You' // Default to current user
  })

  // Remove passenger assignment logic for now

  // Load flights
  useEffect(() => {
    loadFlights()
  }, [tripId])

  const loadFlights = async () => {
    try {
      setLoading(true)
      
      // Fetch flights from DynamoDB using Amplify data client
      const { data: flightData, errors } = await client.models.Flight.list({
        filter: { tripId: { eq: tripId } },
        authMode: 'userPool' // Use authenticated user
      })
      
      if (errors) {
        console.error('Error loading flights:', errors)
        return
      }
      
      setFlights(flightData || [])
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
      // Call our API route instead of the old mock function
      const response = await fetch('/api/flight-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flightNumber: flightForm.flightNumber,
          date: flightForm.departureTime?.split('T')[0] || null,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Flight lookup failed:', error)
        alert(error.details || 'Could not find flight information. Please check the flight number and try again.')
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.flightData) {
        const flight = data.flightData
        
        // Update form with flight data
        setFlightForm(prev => ({
          ...prev,
          airline: flight.airline,
          departureAirport: flight.departureAirport.code,
          arrivalAirport: flight.arrivalAirport.code,
          departureTime: flight.departureTime.replace(':00Z', '').replace('Z', ''), // Convert to datetime-local format
          arrivalTime: flight.arrivalTime.replace(':00Z', '').replace('Z', ''), // Convert to datetime-local format
          terminal: flight.terminal || prev.terminal,
          // Keep user's existing data for these fields
          confirmationCode: prev.confirmationCode,
          gate: prev.gate,
          notes: prev.notes ? `${prev.notes}\n\nAircraft: ${flight.aircraft || 'Unknown'}` : `Aircraft: ${flight.aircraft || 'Unknown'}`,
        }))
        
        // Show success message
        console.log('✅ Flight data loaded:', flight)
      }
    } catch (error) {
      console.error('Error looking up flight:', error)
      alert('An error occurred while looking up the flight. Please try again.')
    } finally {
      setSearchingFlight(false)
    }
  }

  const handleSaveFlight = async () => {
    try {
      // Validate required fields
      if (!flightForm.airline || !flightForm.departureTime || !flightForm.arrivalTime || 
          !flightForm.departureAirport || !flightForm.arrivalAirport) {
        alert('Please fill in all required fields')
        return
      }

      // Prepare flight data for GraphQL
      const flightData = {
        tripId,
        airline: flightForm.airline,
        flightNumber: flightForm.flightNumber.toUpperCase() || `${flightForm.airline.substring(0,2).toUpperCase()}${Date.now().toString().slice(-4)}`,
        departureAirport: JSON.stringify({
          code: flightForm.departureAirport.toUpperCase(),
          name: `${flightForm.departureAirport.toUpperCase()} Airport`,
          city: 'Unknown'
        }),
        arrivalAirport: JSON.stringify({
          code: flightForm.arrivalAirport.toUpperCase(), 
          name: `${flightForm.arrivalAirport.toUpperCase()} Airport`,
          city: 'Unknown'
        }),
        departureTime: flightForm.departureTime,
        arrivalTime: flightForm.arrivalTime,
        terminal: flightForm.terminal,
        gate: flightForm.gate,
        confirmationCode: flightForm.confirmationCode,
        notes: flightForm.notes,
        direction: flightForm.direction,
        addedByUserName: flightForm.addedByUserName
      }

      if (editingFlight) {
        // Update existing flight
        const { data: updatedFlight, errors } = await client.models.Flight.update({
          id: editingFlight,
          ...flightData
        }, { authMode: 'userPool' })
        
        if (errors) {
          console.error('Error updating flight:', errors)
          alert('Error updating flight. Please try again.')
          return
        }
        
        addActivity({
          type: 'update',
          category: 'flight',
          action: `Updated flight ${flightData.flightNumber}`,
          details: { route: `${flightForm.departureAirport} → ${flightForm.arrivalAirport}` }
        })
      } else {
        // Create new flight
        const { data: newFlight, errors } = await client.models.Flight.create(flightData, {
          authMode: 'userPool'
        })
        
        if (errors) {
          console.error('Error creating flight:', errors)
          alert('Error creating flight. Please try again.')
          return
        }
        
        addActivity({
          type: 'create',
          category: 'flight',
          action: `Added flight ${flightData.flightNumber}`,
          details: { route: `${flightForm.departureAirport} → ${flightForm.arrivalAirport}` }
        })
      }

      // Reset form
      setFlightForm({
        airline: '',
        flightNumber: '',
        departureTime: '',
        arrivalTime: '',
        departureAirport: '',
        arrivalAirport: '',
        confirmationCode: '',
        terminal: '',
        gate: '',
        notes: '',
        direction: 'departure',
        addedByUserName: 'You'
      })
      setIsAddingFlight(false)
      setEditingFlight(null)
      
      // Reload flights from database
      await loadFlights()
      
      if (onFlightsUpdate) {
        onFlightsUpdate(flights)
      }
    } catch (error) {
      console.error('Error saving flight:', error)
      alert('Error saving flight. Please try again.')
    }
  }

  const handleDeleteFlight = async (flightId: string) => {
    try {
      const flight = flights.find(f => f.id === flightId)
      
      // Delete from DynamoDB
      const { errors } = await client.models.Flight.delete({
        id: flightId
      }, { authMode: 'userPool' })
      
      if (errors) {
        console.error('Error deleting flight:', errors)
        alert('Error deleting flight. Please try again.')
        return
      }
      
      if (flight) {
        addActivity({
          type: 'delete',
          category: 'flight',
          action: `Deleted flight ${flight.flightNumber || flight.airline}`,
          details: { 
            route: `${JSON.parse(flight.departureAirport as string).code} → ${JSON.parse(flight.arrivalAirport as string).code}`
          }
        })
      }
      
      // Reload flights from database
      await loadFlights()
      
      if (onFlightsUpdate) {
        onFlightsUpdate(flights.filter(f => f.id !== flightId))
      }
    } catch (error) {
      console.error('Error deleting flight:', error)
      alert('Error deleting flight. Please try again.')
    }
  }

  const handleEditFlight = (flight: Flight) => {
    // Parse airport JSON data
    const departureAirport = JSON.parse(flight.departureAirport as string)
    const arrivalAirport = JSON.parse(flight.arrivalAirport as string)
    
    setFlightForm({
      airline: flight.airline,
      flightNumber: flight.flightNumber || '',
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      departureAirport: departureAirport.code,
      arrivalAirport: arrivalAirport.code,
      confirmationCode: flight.confirmationCode || '',
      terminal: flight.terminal || '',
      gate: flight.gate || '',
      notes: flight.notes || '',
      direction: flight.direction || 'departure',
      addedByUserName: flight.addedByUserName || 'You'
    })
    setEditingFlight(flight.id)
    setIsAddingFlight(true)
  }

  // Passenger assignment removed for now

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
  }

  const parseAirportData = (airportJson: string | unknown) => {
    try {
      if (typeof airportJson === 'string') {
        return JSON.parse(airportJson)
      }
      return airportJson
    } catch {
      return { code: 'UNK', name: 'Unknown Airport', city: 'Unknown' }
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
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-600">
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
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Added By Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Added By *</label>
              <input
                type="text"
                value={flightForm.addedByUserName}
                onChange={(e) => setFlightForm({ ...flightForm, addedByUserName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
                required
              />
            </div>

            {/* Departure Date/Time */}
            <div>
              <label className="block text-sm font-medium mb-1">Departure Date & Time *</label>
              <input
                type="datetime-local"
                value={flightForm.departureTime}
                onChange={(e) => setFlightForm({ ...flightForm, departureTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Arrival Date/Time */}
            <div>
              <label className="block text-sm font-medium mb-1">Arrival Date & Time *</label>
              <input
                type="datetime-local"
                value={flightForm.arrivalTime}
                onChange={(e) => setFlightForm({ ...flightForm, arrivalTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Confirmation Number */}
            <div>
              <label className="block text-sm font-medium mb-1">Confirmation Number</label>
              <input
                type="text"
                placeholder="e.g., ABC123"
                value={flightForm.confirmationCode}
                onChange={(e) => setFlightForm({ ...flightForm, confirmationCode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Direction */}
            <div>
              <label className="block text-sm font-medium mb-1">Direction</label>
              <select
                value={flightForm.direction}
                onChange={(e) => setFlightForm({ ...flightForm, direction: e.target.value as 'arrival' | 'departure' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="departure">Departure</option>
                <option value="arrival">Arrival</option>
              </select>
            </div>

            {/* Empty div to maintain grid layout */}
            <div></div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                placeholder="Additional information..."
                value={flightForm.notes}
                onChange={(e) => setFlightForm({ ...flightForm, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  departureTime: '',
                  arrivalTime: '',
                  departureAirport: '',
                  arrivalAirport: '',
                  confirmationCode: '',
                  terminal: '',
                  gate: '',
                  notes: '',
                  direction: 'departure',
                  addedByUserName: 'You'
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
            const departureAirport = parseAirportData(flight.departureAirport)
            const arrivalAirport = parseAirportData(flight.arrivalAirport)
            const departureDateTime = formatDateTime(flight.departureTime)
            const arrivalDateTime = formatDateTime(flight.arrivalTime)
            
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
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        flight.direction === 'departure' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}>
                        {flight.direction === 'departure' ? 'Departure' : 'Arrival'}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{departureAirport.code}</p>
                        <p className="text-xs text-gray-500">Departure</p>
                      </div>
                      <div className="flex-1 flex items-center">
                        <div className="flex-1 h-[2px] bg-gradient-to-r from-blue-400 to-purple-400"></div>
                        <span className="mx-2">→</span>
                        <div className="flex-1 h-[2px] bg-gradient-to-r from-purple-400 to-pink-400"></div>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{arrivalAirport.code}</p>
                        <p className="text-xs text-gray-500">Arrival</p>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span>🛫</span>
                        <span className="font-semibold">{departureDateTime.date}</span>
                        <span>•</span>
                        <span>{departureDateTime.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🛬</span>
                        <span className="font-semibold">{arrivalDateTime.date}</span>
                        <span>•</span>
                        <span>{arrivalDateTime.time}</span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Added By</p>
                        <p className="font-semibold text-sm">{flight.addedByUserName || 'Unknown'}</p>
                      </div>
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
                      {flight.confirmationCode && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Confirmation</p>
                          <p className="font-semibold text-sm">{flight.confirmationCode}</p>
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

                    {/* Flight info complete */}
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

      {/* Passenger assignment modal removed */}
    </div>
  )
}