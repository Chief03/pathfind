'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  overlay?: boolean
  className?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  message, 
  overlay = false, 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  const spinner = (
    <div className={`${className} ${overlay ? 'flex items-center justify-center' : ''}`}>
      <div className={`animate-spin rounded-full border-b-2 border-white ${sizeClasses[size]}`} />
      {message && (
        <span className={`text-white ml-3 ${size === 'sm' ? 'text-sm' : 'text-lg'}`}>
          {message}
        </span>
      )}
    </div>
  )

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20">
          {spinner}
        </div>
      </div>
    )
  }

  return spinner
}

// Inline loading spinner for buttons
export function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full h-4 w-4 border-b-2 border-white ${className}`} />
  )
}