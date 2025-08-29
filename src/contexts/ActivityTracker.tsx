'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

export interface Activity {
  id: string
  timestamp: Date
  type: 'create' | 'update' | 'delete' | 'view' | 'navigate' | 'error' | 'success'
  category: 'trip' | 'flight' | 'event' | 'place' | 'budget' | 'user' | 'system'
  action: string
  details?: any
  userId?: string
  userName?: string
  icon?: string
  color?: string
}

interface ActivityTrackerContextType {
  activities: Activity[]
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void
  clearActivities: () => void
  getRecentActivities: (count?: number) => Activity[]
  getActivitiesByCategory: (category: Activity['category']) => Activity[]
  getActivitiesByType: (type: Activity['type']) => Activity[]
  exportActivities: () => string
}

const ActivityTrackerContext = createContext<ActivityTrackerContextType | undefined>(undefined)

export const useActivityTracker = () => {
  const context = useContext(ActivityTrackerContext)
  if (!context) {
    throw new Error('useActivityTracker must be used within ActivityTrackerProvider')
  }
  return context
}

const MAX_ACTIVITIES = 500 // Keep last 500 activities in memory

export const ActivityTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app_activities')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          return parsed.map((a: any) => ({
            ...a,
            timestamp: new Date(a.timestamp)
          }))
        } catch (e) {
          console.error('Failed to parse stored activities:', e)
        }
      }
    }
    return []
  })

  // Save to localStorage whenever activities change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_activities', JSON.stringify(activities))
    }
  }, [activities])

  const addActivity = useCallback((activity: Omit<Activity, 'id' | 'timestamp'>) => {
    const newActivity: Activity = {
      ...activity,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      icon: activity.icon || getDefaultIcon(activity.category, activity.type),
      color: activity.color || getDefaultColor(activity.category, activity.type)
    }

    setActivities(prev => {
      const updated = [newActivity, ...prev]
      // Keep only the most recent activities
      return updated.slice(0, MAX_ACTIVITIES)
    })

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔔 Activity:', newActivity.action, newActivity)
    }
  }, [])

  const clearActivities = useCallback(() => {
    setActivities([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_activities')
    }
  }, [])

  const getRecentActivities = useCallback((count: number = 10) => {
    return activities.slice(0, count)
  }, [activities])

  const getActivitiesByCategory = useCallback((category: Activity['category']) => {
    return activities.filter(a => a.category === category)
  }, [activities])

  const getActivitiesByType = useCallback((type: Activity['type']) => {
    return activities.filter(a => a.type === type)
  }, [activities])

  const exportActivities = useCallback(() => {
    const data = activities.map(a => ({
      ...a,
      timestamp: a.timestamp.toISOString()
    }))
    return JSON.stringify(data, null, 2)
  }, [activities])

  return (
    <ActivityTrackerContext.Provider value={{
      activities,
      addActivity,
      clearActivities,
      getRecentActivities,
      getActivitiesByCategory,
      getActivitiesByType,
      exportActivities
    }}>
      {children}
    </ActivityTrackerContext.Provider>
  )
}

// Helper functions for default icons and colors
function getDefaultIcon(category: Activity['category'], type: Activity['type']): string {
  const icons = {
    trip: '✈️',
    flight: '🛫',
    event: '📅',
    place: '📍',
    budget: '💰',
    user: '👤',
    system: '⚙️'
  }
  return icons[category] || '📝'
}

function getDefaultColor(category: Activity['category'], type: Activity['type']): string {
  const colors = {
    create: 'text-green-600',
    update: 'text-blue-600',
    delete: 'text-red-600',
    view: 'text-gray-600',
    navigate: 'text-purple-600',
    error: 'text-red-700',
    success: 'text-green-700'
  }
  return colors[type] || 'text-gray-700'
}