'use client'

import { useState } from 'react'

interface SubscriptionUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentCount: number
  maxTrips: number
  subscriptionType: string
}

export default function SubscriptionUpgradeModal({
  isOpen,
  onClose,
  currentCount,
  maxTrips,
  subscriptionType
}: SubscriptionUpgradeModalProps) {
  const [isUpgrading, setIsUpgrading] = useState(false)

  if (!isOpen) return null

  const handleUpgrade = async () => {
    setIsUpgrading(true)
    // TODO: Implement actual payment processing here
    // For now, just simulate the process
    setTimeout(() => {
      setIsUpgrading(false)
      // In a real app, you would update the user's subscription in the backend
      alert('Upgrade successful! You can now create unlimited trips.')
      onClose()
    }, 2000)
  }

  const premiumFeatures = [
    'Unlimited trips',
    'Priority customer support',
    'Advanced trip analytics',
    'Custom trip templates',
    'Extended collaboration features'
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-2xl font-bold mb-2">Trip Limit Reached</h2>
          <p className="text-gray-600 dark:text-gray-400">
            You've created {currentCount} of {maxTrips} trips allowed on your {subscriptionType} plan
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-orange-500">⚠️</span>
            <span className="font-semibold text-orange-800 dark:text-orange-300">
              Cannot Create More Trips
            </span>
          </div>
          <p className="text-sm text-orange-700 dark:text-orange-400">
            To create more trips, you can either delete an existing trip or upgrade to Premium.
          </p>
        </div>

        {/* Premium Features */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
            🌟 Upgrade to Premium and get:
          </h3>
          <ul className="space-y-2">
            {premiumFeatures.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">$9.99/month</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cancel anytime</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
              isUpgrading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-105 shadow-lg'
            }`}
          >
            {isUpgrading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : (
              '🚀 Upgrade to Premium'
            )}
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-3 px-4 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Maybe Later
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}