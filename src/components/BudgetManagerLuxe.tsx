'use client'

import { useState, useEffect } from 'react'
import { generateClient } from 'aws-amplify/data'
import { useActivityTracker } from '@/contexts/ActivityTracker'

interface BudgetManagerLuxeProps {
  tripData: any
}

interface Category {
  id: string
  name: string
  icon: string
  color: string
  target: number
  spent: number
}

interface Expense {
  id: string
  title: string
  amount: number
  category: string
  paidBy: string
  paidByName: string
  participants: string[]
  date: string
  notes?: string
}

const defaultCategories = [
  { id: 'accommodation', name: 'Accommodation', icon: '🏨', color: 'from-blue-500 to-indigo-600' },
  { id: 'food', name: 'Food & Drinks', icon: '🍽️', color: 'from-orange-500 to-red-600' },
  { id: 'transport', name: 'Transportation', icon: '🚗', color: 'from-green-500 to-emerald-600' },
  { id: 'activities', name: 'Activities', icon: '🎯', color: 'from-purple-500 to-pink-600' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: 'from-amber-500 to-yellow-600' },
  { id: 'misc', name: 'Miscellaneous', icon: '📦', color: 'from-gray-500 to-slate-600' }
]

export default function BudgetManagerLuxe({ tripData }: BudgetManagerLuxeProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showCategoryTargets, setShowCategoryTargets] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'expenses'>('overview')
  const [participants, setParticipants] = useState<any[]>([])
  const { addActivity } = useActivityTracker()

  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'food',
    paidBy: '',
    participants: [] as string[],
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [categoryTargets, setCategoryTargets] = useState<Record<string, number>>({
    accommodation: 0,
    food: 0,
    transport: 0,
    activities: 0,
    shopping: 0,
    misc: 0
  })

  useEffect(() => {
    if (tripData?.id) {
      loadBudgetData()
      loadParticipants()
    }
  }, [tripData])

  const loadBudgetData = async () => {
    const savedCategories = defaultCategories.map(cat => ({
      ...cat,
      target: categoryTargets[cat.id] || 0,
      spent: 0
    }))
    setCategories(savedCategories)
    updateCategorySpending()
  }

  const loadParticipants = async () => {
    const mockParticipants = [
      { id: 'user1', name: 'You', email: 'you@example.com' },
      { id: 'user2', name: 'Travel Buddy', email: 'buddy@example.com' }
    ]
    setParticipants(mockParticipants)
  }

  const updateCategorySpending = () => {
    const spending: Record<string, number> = {}
    expenses.forEach(expense => {
      spending[expense.category] = (spending[expense.category] || 0) + expense.amount
    })
    
    setCategories(prev => prev.map(cat => ({
      ...cat,
      spent: spending[cat.id] || 0
    })))
  }

  const calculatePersonSpent = (userId: string) => {
    return expenses
      .filter(e => e.paidBy === userId)
      .reduce((sum, e) => sum + e.amount, 0)
  }

  const handleAddExpense = async () => {
    if (!newExpense.title || !newExpense.amount || !newExpense.paidBy) {
      return
    }

    const expense: Expense = {
      id: `exp-${Date.now()}`,
      title: newExpense.title,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      paidBy: newExpense.paidBy,
      paidByName: participants.find(p => p.id === newExpense.paidBy)?.name || 'Unknown',
      participants: newExpense.participants.length > 0 ? newExpense.participants : [newExpense.paidBy],
      date: newExpense.date,
      notes: newExpense.notes
    }

    setExpenses([...expenses, expense])
    updateCategorySpending()
    setShowAddExpense(false)
    
    setNewExpense({
      title: '',
      amount: '',
      category: 'food',
      paidBy: '',
      participants: [],
      date: new Date().toISOString().split('T')[0],
      notes: ''
    })

    addActivity({
      type: 'create',
      category: 'budget',
      action: `Added expense: ${expense.title}`,
      details: expense
    })
  }

  const handleDeleteExpense = (expenseId: string) => {
    setExpenses(expenses.filter(e => e.id !== expenseId))
    updateCategorySpending()
  }

  const handleUpdateTargets = () => {
    setCategories(prev => prev.map(cat => ({
      ...cat,
      target: categoryTargets[cat.id] || 0
    })))
    setShowCategoryTargets(false)
  }

  const totalBudget = categories.reduce((sum, cat) => sum + cat.target, 0)
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
  const remaining = totalBudget - totalSpent

  const getCategoryProgress = (category: Category) => {
    if (category.target === 0) return 0
    return (category.spent / category.target) * 100
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-red-500'
    if (progress >= 80) return 'bg-amber-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-6">
      {/* Elegant Header with Purple Gradient */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-3xl opacity-95"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20"></div>
        
        <div className="relative p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-light text-white tracking-tight">Budget Tracker</h1>
              <p className="text-white/70 font-light mt-1">Manage your trip expenses</p>
            </div>
            
            <button
              onClick={() => setShowCategoryTargets(true)}
              className="px-4 py-2 bg-white/10 backdrop-blur border border-white/20 rounded-xl hover:bg-white/20 transition-all"
            >
              <span className="text-white text-sm font-light">Set Budget</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/60 text-sm font-light">Total Budget</p>
              <p className="text-2xl font-semibold text-white">${totalBudget}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/60 text-sm font-light">Spent</p>
              <p className="text-2xl font-semibold text-white">${totalSpent.toFixed(2)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/60 text-sm font-light">Remaining</p>
              <p className={`text-2xl font-semibold ${remaining >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                ${remaining.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-1">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveView('overview')}
            className={`flex-1 px-4 py-2 rounded-lg transition-all ${
              activeView === 'overview'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('expenses')}
            className={`flex-1 px-4 py-2 rounded-lg transition-all ${
              activeView === 'expenses'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Expenses ({expenses.length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Categories Grid */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Spending by Category</h3>
              <button
                onClick={() => setShowAddExpense(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                + Add Expense
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((category) => {
                const progress = getCategoryProgress(category)
                return (
                  <div key={category.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{category.icon}</span>
                        <span className="font-medium text-gray-900 text-sm">{category.name}</span>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${getProgressColor(progress)}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-900 font-medium">${category.spent.toFixed(0)}</span>
                      <span className="text-gray-500">of ${category.target}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Who Paid What */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Who's Paid What</h3>
            <div className="space-y-3">
              {participants.map((participant) => {
                const spent = calculatePersonSpent(participant.id)
                const percentage = totalSpent > 0 ? (spent / totalSpent) * 100 : 0
                
                return (
                  <div key={participant.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-semibold">
                          {participant.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{participant.name}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-gray-900">${spent.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{percentage.toFixed(0)}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeView === 'expenses' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Expense List</h3>
            <button
              onClick={() => setShowAddExpense(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              + Add Expense
            </button>
          </div>
          
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No expenses recorded yet</p>
              <button
                onClick={() => setShowAddExpense(true)}
                className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                Add your first expense →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => {
                const category = categories.find(c => c.id === expense.category)
                return (
                  <div key={expense.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl mt-0.5">{category?.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{expense.title}</h4>
                          <p className="text-sm text-gray-500">
                            {expense.paidByName} • {new Date(expense.date).toLocaleDateString()}
                          </p>
                          {expense.notes && (
                            <p className="text-sm text-gray-600 mt-1">{expense.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">${expense.amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{category?.name}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light text-gray-900">Add Expense</h2>
              <button
                onClick={() => setShowAddExpense(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">What did you buy? *</label>
                <input
                  type="text"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Lunch at cafe"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Amount *</label>
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Category</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Who paid? *</label>
                <select
                  value={newExpense.paidBy}
                  onChange={(e) => setNewExpense({ ...newExpense, paidBy: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select person...</option>
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Notes (optional)</label>
                <textarea
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="Any details..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddExpense}
                  disabled={!newExpense.title || !newExpense.amount || !newExpense.paidBy}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  Add Expense
                </button>
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Category Targets Modal */}
      {showCategoryTargets && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light text-gray-900">Set Your Budget</h2>
              <button
                onClick={() => setShowCategoryTargets(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">Set spending limits for each category</p>

            <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="text-xl w-6">{cat.icon}</span>
                  <label className="flex-1 text-sm text-gray-700">{cat.name}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={categoryTargets[cat.id] || ''}
                      onChange={(e) => setCategoryTargets({
                        ...categoryTargets,
                        [cat.id]: parseFloat(e.target.value) || 0
                      })}
                      className="w-28 pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right"
                      placeholder="0"
                      step="50"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-purple-50 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Total Budget:</span>
                <span className="font-semibold text-purple-900 text-lg">
                  ${Object.values(categoryTargets).reduce((sum, val) => sum + val, 0)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateTargets}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all"
              >
                Save Budget
              </button>
              <button
                onClick={() => setShowCategoryTargets(false)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
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