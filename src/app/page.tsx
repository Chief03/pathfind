'use client'

import { useState } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import Navigation from '@/components/Navigation'
import HeroSection from '@/components/HeroSection'
import TripDashboard from '@/components/TripDashboard'
import QuickNavFAB from '@/components/QuickNavFAB'
// import TripDashboardSimple from '@/components/TripDashboardSimple'

export default function HomePage() {
  const { user } = useAuthenticator((context) => [context.user])
  const [currentView, setCurrentView] = useState<'hero' | 'dashboard'>('hero')
  const [tripData, setTripData] = useState(null)

  const handleTripCreated = (trip: any) => {
    setTripData(trip)
    setCurrentView('dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navigation />
      
      {currentView === 'hero' ? (
        <HeroSection onTripCreated={handleTripCreated} />
      ) : (
        <TripDashboard tripData={tripData} />
      )}
      
      {currentView === 'dashboard' && <QuickNavFAB />}
    </div>
  )
}