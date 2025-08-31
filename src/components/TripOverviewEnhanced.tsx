'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'

interface TripOverviewEnhancedProps {
  tripData: any
  onTripUpdate?: (trip: any) => void
  flightCount: number
  eventCount: number
  placeCount: number
  totalBudget: number
}

interface TodoItem {
  id: string
  text: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
}

interface WeatherData {
  temp: number
  condition: string
  icon: string
  forecast: Array<{
    day: string
    high: number
    low: number
    condition: string
    icon: string
  }>
}

const weatherIcons: Record<string, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
  snowy: '❄️',
  partly_cloudy: '⛅',
  windy: '💨',
  foggy: '🌫️'
}

export default function TripOverviewEnhanced({ 
  tripData, 
  onTripUpdate,
  flightCount = 0,
  eventCount = 0,
  placeCount = 0,
  totalBudget = 0
}: TripOverviewEnhancedProps) {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: '1', text: 'Book accommodations', completed: false, priority: 'high' },
    { id: '2', text: 'Check passport expiration', completed: false, priority: 'high' },
    { id: '3', text: 'Research local transportation', completed: false, priority: 'medium' },
    { id: '4', text: 'Download offline maps', completed: false, priority: 'low' },
    { id: '5', text: 'Get travel insurance', completed: false, priority: 'high' },
    { id: '6', text: 'Pack essentials', completed: false, priority: 'medium' }
  ])
  const [newTodo, setNewTodo] = useState('')
  const [showAddTodo, setShowAddTodo] = useState(false)
  const [weather, setWeather] = useState<WeatherData>({
    temp: 75,
    condition: 'Partly Cloudy',
    icon: 'partly_cloudy',
    forecast: [
      { day: 'Mon', high: 78, low: 65, condition: 'Sunny', icon: 'sunny' },
      { day: 'Tue', high: 76, low: 63, condition: 'Partly Cloudy', icon: 'partly_cloudy' },
      { day: 'Wed', high: 72, low: 60, condition: 'Cloudy', icon: 'cloudy' },
      { day: 'Thu', high: 74, low: 62, condition: 'Sunny', icon: 'sunny' },
      { day: 'Fri', high: 77, low: 64, condition: 'Sunny', icon: 'sunny' }
    ]
  })

  const getDaysUntilTrip = () => {
    if (!tripData?.startDate) return null
    const today = new Date()
    const tripDate = new Date(tripData.startDate)
    const diffTime = tripDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getTripDuration = () => {
    if (!tripData?.startDate || !tripData?.endDate) return 0
    const start = new Date(tripData.startDate)
    const end = new Date(tripData.endDate)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const handleToggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const handleAddTodo = () => {
    if (!newTodo.trim()) return
    
    const todo: TodoItem = {
      id: Date.now().toString(),
      text: newTodo,
      completed: false,
      priority: 'medium'
    }
    
    setTodos([...todos, todo])
    setNewTodo('')
    setShowAddTodo(false)
  }

  const handleDeleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const completedTodos = todos.filter(t => t.completed).length
  const todoProgress = todos.length > 0 ? (completedTodos / todos.length) * 100 : 0
  const daysUntilTrip = getDaysUntilTrip()
  const tripDuration = getTripDuration()

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCountdownColor = () => {
    if (!daysUntilTrip) return 'text-gray-600'
    if (daysUntilTrip <= 7) return 'text-red-600'
    if (daysUntilTrip <= 30) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Purple Gradient */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-3xl opacity-95"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500 rounded-full filter blur-3xl opacity-20"></div>
        
        <div className="relative p-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-light text-white tracking-tight mb-2">
                {tripData?.name || 'Your Adventure'}
              </h1>
              <p className="text-white/70 font-light text-lg">
                {tripData?.destinationCity || 'Destination'}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-white/60 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {tripData?.startDate} → {tripData?.endDate}
                </span>
                <span className="text-white/60 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {tripData?.groupSize || 1} {tripData?.groupSize === 1 ? 'Traveler' : 'Travelers'}
                </span>
              </div>
            </div>
            
            {/* Countdown Timer */}
            {daysUntilTrip !== null && daysUntilTrip >= 0 && (
              <div className="text-right">
                <p className="text-white/60 text-sm font-light mb-1">Trip starts in</p>
                <p className={`text-4xl font-bold ${daysUntilTrip <= 7 ? 'text-yellow-300' : 'text-white'}`}>
                  {daysUntilTrip}
                </p>
                <p className="text-white/60 text-sm font-light">
                  {daysUntilTrip === 1 ? 'day' : 'days'}
                </p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✈️</span>
                <div>
                  <p className="text-white/60 text-sm font-light">Flights</p>
                  <p className="text-2xl font-semibold text-white">{flightCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-white/60 text-sm font-light">Events</p>
                  <p className="text-2xl font-semibold text-white">{eventCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-white/60 text-sm font-light">Places</p>
                  <p className="text-2xl font-semibold text-white">{placeCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-white/60 text-sm font-light">Budget</p>
                  <p className="text-2xl font-semibold text-white">${totalBudget}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weather Widget */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Weather Forecast</h3>
            <span className="text-xs text-gray-500">{tripData?.destinationCity}</span>
          </div>
          
          {/* Current Weather */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{weather.temp}°F</p>
                <p className="text-blue-100">{weather.condition}</p>
              </div>
              <span className="text-5xl">{weatherIcons[weather.icon]}</span>
            </div>
          </div>
          
          {/* 5-Day Forecast */}
          <div className="space-y-2">
            {weather.forecast.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 w-12">{day.day}</span>
                <span className="text-2xl">{weatherIcons[day.icon]}</span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-900 font-medium">{day.high}°</span>
                  <span className="text-gray-500">{day.low}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trip To-Do List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Trip Checklist</h3>
              <p className="text-sm text-gray-500 mt-1">
                {completedTodos} of {todos.length} completed
              </p>
            </div>
            <button
              onClick={() => setShowAddTodo(true)}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              + Add Task
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all"
                style={{ width: `${todoProgress}%` }}
              />
            </div>
          </div>
          
          {/* Todo Items */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {todos.map((todo) => (
              <div 
                key={todo.id} 
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  todo.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                } hover:shadow-sm transition-all group`}
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggleTodo(todo.id)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {todo.text}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                  {todo.priority}
                </span>
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trip Duration */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Trip Duration</p>
              <p className="text-2xl font-bold text-gray-900">{tripDuration} Days</p>
            </div>
          </div>
        </div>

        {/* Share Code */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Share Code</p>
              <p className="text-2xl font-mono font-bold text-gray-900">{tripData?.shareCode || 'ABC123'}</p>
            </div>
          </div>
        </div>

        {/* Preparation Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Preparation</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(todoProgress)}% Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Travel Tips for {tripData?.destinationCity}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-medium text-gray-900">Best Time to Visit</p>
              <p className="text-sm text-gray-600">Spring and Fall offer the best weather conditions</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💵</span>
            <div>
              <p className="font-medium text-gray-900">Currency</p>
              <p className="text-sm text-gray-600">USD - Credit cards widely accepted</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🗣️</span>
            <div>
              <p className="font-medium text-gray-900">Language</p>
              <p className="text-sm text-gray-600">English is the primary language</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚰</span>
            <div>
              <p className="font-medium text-gray-900">Tap Water</p>
              <p className="text-sm text-gray-600">Safe to drink in most areas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Todo Modal */}
      {showAddTodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Task</h3>
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Enter task..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleAddTodo}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add Task
              </button>
              <button
                onClick={() => {
                  setShowAddTodo(false)
                  setNewTodo('')
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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