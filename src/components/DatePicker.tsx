'use client'

import { useState, useEffect } from 'react'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  min?: string
  placeholder?: string
  required?: boolean
  className?: string
}

export default function DatePicker({ 
  value, 
  onChange, 
  min, 
  placeholder = 'Select date',
  required = false,
  className = ''
}: DatePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  
  const minDate = min ? new Date(min + 'T00:00:00') : null
  const selectedDate = value ? new Date(value + 'T00:00:00') : null
  
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }
  
  const isDateDisabled = (day: number) => {
    if (!minDate) return false
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return checkDate < minDate
  }
  
  const handleDateSelect = (day: number) => {
    if (isDateDisabled(day)) return
    
    const year = currentMonth.getFullYear()
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayStr}`
    
    onChange(dateStr)
    setShowCalendar(false)
  }
  
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }
  
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }
  
  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    )
  }
  
  const isSelected = (day: number) => {
    if (!selectedDate) return false
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    )
  }
  
  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.date-picker-container')) {
        setShowCalendar(false)
      }
    }
    
    if (showCalendar) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showCalendar])
  
  return (
    <div className="date-picker-container relative">
      <input
        type="text"
        value={formatDateForDisplay(value)}
        onClick={() => setShowCalendar(!showCalendar)}
        readOnly
        placeholder={placeholder}
        required={required}
        className={`cursor-pointer ${className}`}
      />
      
      {showCalendar && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[320px]">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h3 className="font-semibold text-gray-900">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}
            
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const disabled = isDateDisabled(day)
              const selected = isSelected(day)
              const today = isToday(day)
              
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={disabled}
                  className={`
                    p-2 rounded-lg text-sm font-medium transition-all
                    ${disabled 
                      ? 'text-gray-300 bg-gray-50 cursor-not-allowed line-through' 
                      : 'hover:bg-[#FF5A5F] hover:text-white cursor-pointer'
                    }
                    ${selected 
                      ? 'bg-[#FF5A5F] text-white' 
                      : ''
                    }
                    ${today && !selected && !disabled
                      ? 'border-2 border-[#FF5A5F] text-[#FF5A5F] font-bold' 
                      : ''
                    }
                    ${!disabled && !selected && !today
                      ? 'text-gray-700' 
                      : ''
                    }
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border-2 border-[#FF5A5F] rounded"></div>
              <span className="text-gray-600">Today</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-[#FF5A5F] rounded"></div>
              <span className="text-gray-600">Selected</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-50 rounded line-through"></div>
              <span className="text-gray-600">Unavailable</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}