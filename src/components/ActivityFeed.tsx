'use client'

import { useState, useEffect } from 'react'
import { useActivityTracker, Activity } from '@/contexts/ActivityTracker'

interface ActivityFeedProps {
  compact?: boolean
  maxItems?: number
  filter?: {
    category?: Activity['category']
    type?: Activity['type']
  }
}

export default function ActivityFeed({ compact = false, maxItems = 20, filter }: ActivityFeedProps) {
  const { activities, clearActivities, exportActivities } = useActivityTracker()
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([])
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [selectedFilter, setSelectedFilter] = useState<'all' | Activity['category']>('all')
  const [showExportModal, setShowExportModal] = useState(false)

  useEffect(() => {
    let filtered = activities

    // Apply prop filters
    if (filter?.category) {
      filtered = filtered.filter(a => a.category === filter.category)
    }
    if (filter?.type) {
      filtered = filtered.filter(a => a.type === filter.type)
    }

    // Apply UI filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(a => a.category === selectedFilter)
    }

    setFilteredActivities(filtered.slice(0, maxItems))
  }, [activities, filter, selectedFilter, maxItems])

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const handleExport = () => {
    const data = exportActivities()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportModal(false)
  }

  if (compact) {
    return (
      <div className="relative transform hover:scale-[1.02] transition-transform">
        {/* Gadget frame */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl transform translate-y-1"></div>
        <div className="relative bg-gradient-to-b from-gray-600 via-gray-700 to-gray-800 rounded-2xl p-1 shadow-2xl">
          <div className="bg-gradient-to-b from-gray-800 to-black rounded-2xl p-0.5">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl p-5 shadow-inner min-h-[160px]">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-xl pointer-events-none"></div>
              <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50 animate-pulse"></div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h3 className="text-white font-bold text-sm">Activity Feed</h3>
                      <p className="text-white/60 text-xs">{activities.length} events</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className={`w-4 h-4 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {!isExpanded && (
                  <div className="space-y-1">
                    {filteredActivities.slice(0, 3).map(activity => (
                      <div key={activity.id} className="flex items-center gap-2 text-xs">
                        <span>{activity.icon}</span>
                        <span className="text-white/80 truncate flex-1">{activity.action}</span>
                        <span className="text-white/40">{formatTimestamp(activity.timestamp)}</span>
                      </div>
                    ))}
                    {activities.length > 3 && (
                      <p className="text-white/40 text-xs text-center pt-1">+{activities.length - 3} more</p>
                    )}
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    {/* Filter buttons */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <button
                        onClick={() => setSelectedFilter('all')}
                        className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                          selectedFilter === 'all' 
                            ? 'bg-white text-indigo-900' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        All
                      </button>
                      {['trip', 'flight', 'event', 'place'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedFilter(cat as Activity['category'])}
                          className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                            selectedFilter === cat 
                              ? 'bg-white text-indigo-900' 
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Activity list */}
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {filteredActivities.length === 0 ? (
                        <p className="text-white/40 text-xs text-center py-4">No activities yet</p>
                      ) : (
                        filteredActivities.map(activity => (
                          <div key={activity.id} className="bg-black/30 rounded-lg p-2">
                            <div className="flex items-start gap-2">
                              <span className="text-lg mt-0.5">{activity.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-semibold">{activity.action}</p>
                                {activity.details && (
                                  <p className="text-white/60 text-xs mt-0.5 truncate">
                                    {typeof activity.details === 'string' ? activity.details : JSON.stringify(activity.details)}
                                  </p>
                                )}
                                <p className="text-white/40 text-xs mt-1">{formatTimestamp(activity.timestamp)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setShowExportModal(true)}
                        className="flex-1 px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-semibold hover:bg-white/20 transition-colors"
                      >
                        Export
                      </button>
                      <button
                        onClick={clearActivities}
                        className="flex-1 px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full view (non-compact)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📊</span>
          <div>
            <h2 className="text-xl font-bold">Activity Feed</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Tracking {activities.length} events
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Export Log
          </button>
          <button
            onClick={clearActivities}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            selectedFilter === 'all' 
              ? 'bg-indigo-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All
        </button>
        {['trip', 'flight', 'event', 'place', 'budget'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedFilter(cat as Activity['category'])}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              selectedFilter === cat 
                ? 'bg-indigo-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}s
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <span className="text-4xl mb-4 block">📝</span>
            <p>No activities to display</p>
            <p className="text-sm mt-2">Activities will appear here as you use the app</p>
          </div>
        ) : (
          filteredActivities.map(activity => (
            <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span className="text-2xl">{activity.icon}</span>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-semibold ${activity.color}`}>{activity.action}</p>
                    {activity.details && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {typeof activity.details === 'string' ? activity.details : JSON.stringify(activity.details, null, 2)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                    {activity.category}
                  </span>
                  <span className="bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                    {activity.type}
                  </span>
                  {activity.userName && (
                    <span>by {activity.userName}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Export Activity Log</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Export all {activities.length} activities as a JSON file for backup or analysis.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Download JSON
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}