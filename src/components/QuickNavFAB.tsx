'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface QuickAction {
  icon: string
  label: string
  action: () => void
  color: string
}

export default function QuickNavFAB() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const quickActions: QuickAction[] = [
    {
      icon: '✈️',
      label: 'Flights',
      action: () => {
        // Click the flights tab
        const flightsTab = document.querySelector('[data-tab="flights"]') as HTMLButtonElement
        if (flightsTab) flightsTab.click()
        setIsOpen(false)
      },
      color: 'bg-blue-500'
    },
    {
      icon: '📍',
      label: 'Places',
      action: () => {
        // Click the places tab
        const placesTab = document.querySelector('[data-tab="places"]') as HTMLButtonElement
        if (placesTab) placesTab.click()
        setIsOpen(false)
      },
      color: 'bg-green-500'
    },
    {
      icon: '📅',
      label: 'Itinerary',
      action: () => {
        // Click the itinerary tab
        const itineraryTab = document.querySelector('[data-tab="itinerary"]') as HTMLButtonElement
        if (itineraryTab) itineraryTab.click()
        setIsOpen(false)
      },
      color: 'bg-purple-500'
    },
    {
      icon: '💰',
      label: 'Budget',
      action: () => {
        // Click the budget tab
        const budgetTab = document.querySelector('[data-tab="budget"]') as HTMLButtonElement
        if (budgetTab) budgetTab.click()
        setIsOpen(false)
      },
      color: 'bg-yellow-500'
    },
    {
      icon: '🏠',
      label: 'Overview',
      action: () => {
        // Click the overview tab
        const overviewTab = document.querySelector('[data-tab="overview"]') as HTMLButtonElement
        if (overviewTab) overviewTab.click()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setIsOpen(false)
      },
      color: 'bg-gray-500'
    }
  ]

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Quick Action Buttons */}
      <div className={`fixed bottom-20 right-4 z-50 flex flex-col gap-3 transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}>
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className={`${action.color} text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:scale-110 transition-transform`}
            style={{
              transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
            }}
          >
            <span className="text-xl">{action.icon}</span>
            <span className="absolute right-full mr-3 bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* Labels for mobile */}
      {isOpen && (
        <div className="fixed bottom-20 right-20 z-40 flex flex-col gap-3 md:hidden">
          {quickActions.map((action, index) => (
            <div
              key={index}
              className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap h-14 flex items-center"
              style={{
                transitionDelay: `${index * 50}ms`,
                animation: 'slideInRight 0.3s ease-out forwards'
              }}
            >
              {action.label}
            </div>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-4 z-50 bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300 ${
          isOpen ? 'rotate-45' : ''
        }`}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

    </>
  )
}