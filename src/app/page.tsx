'use client'

import { useState } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import Navigation from '@/components/Navigation'
import HeroSection from '@/components/HeroSection'
import TripDashboard from '@/components/TripDashboard'
import MyTrips from '@/components/MyTrips'
import QuickNavFAB from '@/components/QuickNavFAB'
// import TripDashboardSimple from '@/components/TripDashboardSimple'

export default function HomePage() {
  const { user } = useAuthenticator((context) => [context.user])
  const [currentView, setCurrentView] = useState<'hero' | 'dashboard' | 'mytrips'>('hero')
  const [tripData, setTripData] = useState(null)

  const handleTripCreated = (trip: any) => {
    setTripData(trip)
    setCurrentView('dashboard')
  }

  const handleViewMyTrips = () => {
    setCurrentView('mytrips')
  }

  const handleTripSelected = (trip: any) => {
    setTripData(trip)
    setCurrentView('dashboard')
  }

  const handleBackToHome = () => {
    setCurrentView('hero')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navigation onViewMyTrips={handleViewMyTrips} />
      
      {currentView === 'hero' && (
        <HeroSection onTripCreated={handleTripCreated} />
      )}
      
      {currentView === 'mytrips' && (
        <MyTrips 
          onTripSelected={handleTripSelected} 
          onBackToHome={handleBackToHome}
        />
      )}
      
      {currentView === 'dashboard' && (
        <TripDashboard tripData={tripData} />
      )}
      
      {currentView === 'dashboard' && <QuickNavFAB />}
    </div>
  )
}