'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import { parseFlightNumber, lookupFlight } from '../lib/flightLookup'
import { getEventSuggestions, eventCategories, EventSuggestion } from '../lib/eventSuggestions'
import { fetchUserAttributes } from 'aws-amplify/auth'
import TripOverviewModern from './TripOverviewModern'
import FlightManagement from './FlightManagement'
import ItineraryLuxe from './ItineraryLuxe'
import PlacesDiscovery from './PlacesDiscovery'

interface TripDashboardProps {
  tripData: any
}

export default function TripDashboard({ tripData: initialTripData }: TripDashboardProps) {
  const [tripData, setTripData] = useState(initialTripData)
  const [activeTab, setActiveTab] = useState('overview')
  const [flights, setFlights] = useState<any[]>([])
  const [itinerary, setItinerary] = useState<any[]>([])
  const [places, setPlaces] = useState<any[]>([])
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({
    destinationCity: tripData?.destinationCity || '',
    groupSize: tripData?.groupSize || 2,
    startDate: tripData?.startDate || '',
    endDate: tripData?.endDate || ''
  })
  const [showAddFlight, setShowAddFlight] = useState(false)
  const [savingFlight, setSavingFlight] = useState(false)
  const [userNickname, setUserNickname] = useState<string>('')
  const [tripParticipants, setTripParticipants] = useState<any[]>([])
  const [expandedFlight, setExpandedFlight] = useState<string | null>(null)
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [eventSuggestions, setEventSuggestions] = useState<EventSuggestion[]>([])
  const [customEvent, setCustomEvent] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    time: '',
    cost: '',
    duration: '',
    category: 'activity'
  })
  const [budgets, setBudgets] = useState<any[]>([])
  const [showAddBudgetCategory, setShowAddBudgetCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState('')
  const [globalBudgetMode, setGlobalBudgetMode] = useState<'pot' | 'per_person'>('pot')
  const [newFlight, setNewFlight] = useState({
    arrivalAirport: '',
    arrivalTime: '',
    departureAirport: '',
    departureTime: '',
    airline: '',
    flightNumber: '',
    direction: 'arrival' as 'arrival' | 'departure',
    forWho: 'myself'
  })

  useEffect(() => {
    if (tripData?.id) {
      loadTripData()
    }
    // Update edit values when tripData changes
    setEditValues({
      destinationCity: tripData?.destinationCity || '',
      groupSize: tripData?.groupSize || 2,
      startDate: tripData?.startDate || '',
      endDate: tripData?.endDate || ''
    })
  }, [tripData])

  useEffect(() => {
    fetchUserNickname()
  }, [])

  useEffect(() => {
    if (tripData?.destinationCity) {
      const suggestions = getEventSuggestions(tripData.destinationCity)
      setEventSuggestions(suggestions)
    }
  }, [tripData?.destinationCity])

  useEffect(() => {
    if (tripData?.id && activeTab === 'budget') {
      loadBudgets()
    }
  }, [tripData?.id, activeTab])

  const fetchUserNickname = async () => {
    try {
      const attributes = await fetchUserAttributes()
      setUserNickname(attributes.given_name || attributes.email || 'User')
    } catch (error) {
      console.error('Error fetching user attributes:', error)
      setUserNickname('User')
    }
  }

  const loadTripData = async () => {
    if (!tripData?.id) return
    
    try {
      const client = generateClient() as any
      
      // Load flights
      const flightData = await client.models.Flight.list({
        filter: { tripId: { eq: tripData.id } }
      })
      setFlights(flightData.data || [])
      
      // Load itinerary items
      const itineraryData = await client.models.ItineraryItem.list({
        filter: { tripId: { eq: tripData.id } }
      })
      setItinerary(itineraryData.data || [])
      
      // Load places
      const placesData = await client.models.Place.list({
        filter: { tripId: { eq: tripData.id } }
      })
      setPlaces(placesData.data || [])
    } catch (error) {
      console.error('Error loading trip data:', error)
    }
  }

  const loadBudgets = async () => {
    if (!tripData?.id) return
    
    try {
      const client = generateClient() as any
      const budgetData = await client.models.Budget.list({
        filter: { tripId: { eq: tripData.id } }
      })
      
      if (budgetData.data && budgetData.data.length > 0) {
        setBudgets(budgetData.data)
      } else {
        // Initialize default budgets if none exist
        await initializeDefaultBudgets()
      }
    } catch (error) {
      console.error('Error loading budgets:', error)
    }
  }

  const initializeDefaultBudgets = async () => {
    if (!tripData?.id) return
    
    const defaultCategories = [
      { name: 'Accommodation', icon: '🏨' },
      { name: 'Food & Drinks', icon: '🍽️' },
      { name: 'Transportation', icon: '🚗' },
      { name: 'Activities', icon: '🎯' },
      { name: 'Shopping', icon: '🛍️' }
    ]
    
    try {
      const client = generateClient() as any
      const groupSize = tripData.groupSize || 2
      
      const newBudgets = await Promise.all(
        defaultCategories.map(cat => 
          client.models.Budget.create({
            tripId: tripData.id,
            category: cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            name: cat.name,
            totalAmount: 0,
            perPersonAmount: 0,
            groupSize: groupSize
          })
        )
      )
      
      setBudgets(newBudgets.map((result: any) => result.data).filter(Boolean))
    } catch (error) {
      console.error('Error initializing budgets:', error)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'flights', label: 'Flights', icon: '✈️' },
    { id: 'itinerary', label: 'Itinerary', icon: '📅' },
    { id: 'places', label: 'Places', icon: '📍' },
    { id: 'budget', label: 'Budget', icon: '💰' },
  ]

  return (
    <div className="app-container">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Trip Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {tripData?.name || 'Your Trip'}
              </h1>
              <p className="text-gray-600 mt-2">
                {tripData?.destinationCity} • {tripData?.startDate} to {tripData?.endDate}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Share Code</p>
              <p className="text-xl font-mono font-bold">{tripData?.shareCode}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-center transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span className="text-2xl mb-1">{tab.icon}</span>
                <div className="text-sm font-medium">{tab.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-md p-6">
          {activeTab === 'overview' && (
            <TripOverviewModern 
              tripData={tripData} 
              onTripUpdate={(updatedTrip) => setTripData(updatedTrip)}
              flightCount={flights.length}
              eventCount={itinerary.length}
              placeCount={places.length}
              totalBudget={budgets.reduce((sum, b) => sum + (b.amount || 0), 0)}
            />
          )}

          {activeTab === 'flights' && (
            <FlightManagement 
              tripId={tripData?.id} 
              tripData={tripData}
              onFlightsUpdate={(updatedFlights) => setFlights(updatedFlights)}
            />
          )}

          {activeTab === 'itinerary' && (
            <ItineraryLuxe tripData={tripData} />
          )}

          {activeTab === 'places' && (
            <PlacesDiscovery tripData={tripData} />
          )}

          {activeTab === 'budget' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Budget Tracker</h2>
              {budgets.length === 0 ? (
                <p className="text-gray-500">Loading budget categories...</p>
              ) : (
                <div className="space-y-4">
                  {budgets.map(budget => (
                    <div key={budget.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{budget.name}</h3>
                          <p className="text-sm text-gray-600">
                            Total: ${budget.totalAmount || 0}
                          </p>
                          <p className="text-sm text-gray-600">
                            Per person: ${budget.perPersonAmount || 0}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingBudget(budget.id)
                            setEditingAmount(budget.totalAmount?.toString() || '0')
                          }}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center font-bold">
                      <span>Total Budget</span>
                      <span>${budgets.reduce((sum, b) => sum + (b.totalAmount || 0), 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                      <span>Per Person</span>
                      <span>${budgets.reduce((sum, b) => sum + (b.perPersonAmount || 0), 0)}</span>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowAddBudgetCategory(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add Category
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}