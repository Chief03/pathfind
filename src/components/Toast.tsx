'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Toast context
interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string) => void
  showWarning: (title: string, message?: string) => void
  showInfo: (title: string, message?: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Hook to use toast context
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast Provider component
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 15)
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])

    // Auto remove after duration
    const duration = toast.duration || (toast.type === 'error' ? 6000 : 4000)
    setTimeout(() => removeToast(id), duration)
  }

  const showSuccess = (title: string, message?: string) => {
    showToast({ type: 'success', title, message })
  }

  const showError = (title: string, message?: string) => {
    showToast({ type: 'error', title, message })
  }

  const showWarning = (title: string, message?: string) => {
    showToast({ type: 'warning', title, message })
  }

  const showInfo = (title: string, message?: string) => {
    showToast({ type: 'info', title, message })
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider 
      value={{ showToast, showSuccess, showError, showWarning, showInfo, removeToast }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// Toast Container component
function ToastContainer({ 
  toasts, 
  onRemove 
}: { 
  toasts: Toast[]
  onRemove: (id: string) => void 
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// Individual Toast component
function ToastItem({ 
  toast, 
  onRemove 
}: { 
  toast: Toast
  onRemove: (id: string) => void 
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleRemove = () => {
    setIsVisible(false)
    setTimeout(() => onRemove(toast.id), 300) // Wait for animation
  }

  const getToastStyles = () => {
    const baseStyles = "p-4 rounded-lg shadow-lg backdrop-blur-sm border transform transition-all duration-300 max-w-md"
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-green-500/20 border-green-500/30 text-green-100`
      case 'error':
        return `${baseStyles} bg-red-500/20 border-red-500/30 text-red-100`
      case 'warning':
        return `${baseStyles} bg-yellow-500/20 border-yellow-500/30 text-yellow-100`
      case 'info':
        return `${baseStyles} bg-blue-500/20 border-blue-500/30 text-blue-100`
      default:
        return `${baseStyles} bg-gray-500/20 border-gray-500/30 text-gray-100`
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '📌'
    }
  }

  return (
    <div
      className={`${getToastStyles()} ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <span className="text-xl mt-0.5">{getIcon()}</span>
          <div className="flex-1">
            <p className="font-semibold text-sm">{toast.title}</p>
            {toast.message && (
              <p className="text-xs mt-1 opacity-90">{toast.message}</p>
            )}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="text-xs underline mt-2 hover:no-underline opacity-90 hover:opacity-100"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={handleRemove}
          className="ml-4 text-lg leading-none opacity-70 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  )
}