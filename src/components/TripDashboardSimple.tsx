'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../types/schema'
import { parseFlightNumber, lookupFlight } from '../lib/flightLookup'
import { getEventSuggestions, eventCategories, EventSuggestion } from '../lib/eventSuggestions'
import { fetchUserAttributes } from 'aws-amplify/auth'

interface TripDashboardProps {
  tripData: any
}

export default function TripDashboardSimple({ tripData }: TripDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'flights', label: 'Flights', icon: '✈️' },
    { id: 'itinerary', label: 'Itinerary', icon: '📅' },
    { id: 'places', label: 'Places', icon: '📍' },
    { id: 'budget', label: 'Budget', icon: '💰' },
  ];

  return (
    <div className="app-container">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1>Trip Dashboard</h1>
        <p>Trip: {tripData?.name || 'No trip'}</p>
        
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'active' : ''}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        
        <div className="tab-content">
          {activeTab === 'overview' && <div>Overview content</div>}
          {activeTab === 'flights' && <div>Flights content</div>}
          {activeTab === 'itinerary' && <div>Itinerary content</div>}
          {activeTab === 'places' && <div>Places content</div>}
          {activeTab === 'budget' && <div>Budget content</div>}
        </div>
      </div>
    </div>
  )
}