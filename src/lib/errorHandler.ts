import { APIError, ValidationError } from './apiClient'

// User-friendly error messages
const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: {
    title: 'Connection Problem',
    message: 'Please check your internet connection and try again.'
  },
  TIMEOUT_ERROR: {
    title: 'Request Timeout',
    message: 'The request took too long. Please try again.'
  },
  
  // Authentication errors
  UNAUTHORIZED: {
    title: 'Authentication Required',
    message: 'Please sign in to continue.'
  },
  FORBIDDEN: {
    title: 'Access Denied',
    message: 'You do not have permission to perform this action.'
  },
  
  // Trip-related errors
  TRIP_NOT_FOUND: {
    title: 'Trip Not Found',
    message: 'The trip you are looking for does not exist or has been deleted.'
  },
  INVALID_SHARE_CODE: {
    title: 'Invalid Share Code',
    message: 'The share code you entered is not valid. Please double-check and try again.'
  },
  TRIP_CREATION_FAILED: {
    title: 'Failed to Create Trip',
    message: 'We could not create your trip at this time. Please try again.'
  },
  ALREADY_PARTICIPANT: {
    title: 'Already Joined',
    message: 'You are already a participant in this trip.'
  },
  
  // Flight errors
  FLIGHT_NOT_FOUND: {
    title: 'Flight Not Found',
    message: 'The flight information could not be found. Please check your flight details.'
  },
  INVALID_FLIGHT_NUMBER: {
    title: 'Invalid Flight Number',
    message: 'Please enter a valid flight number (e.g., AA123, BA4567).'
  },
  FLIGHT_API_ERROR: {
    title: 'Flight Service Unavailable',
    message: 'Unable to fetch flight information right now. Please try again later.'
  },
  
  // Validation errors
  VALIDATION_ERROR: {
    title: 'Invalid Information',
    message: 'Please check the information you entered and try again.'
  },
  REQUIRED_FIELD_MISSING: {
    title: 'Missing Information',
    message: 'Please fill in all required fields.'
  },
  INVALID_DATE_RANGE: {
    title: 'Invalid Dates',
    message: 'End date must be after the start date.'
  },
  INVALID_EMAIL: {
    title: 'Invalid Email',
    message: 'Please enter a valid email address.'
  },
  
  // Server errors
  SERVER_ERROR: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again in a few minutes.'
  },
  SERVICE_UNAVAILABLE: {
    title: 'Service Temporarily Unavailable',
    message: 'The service is temporarily unavailable. Please try again later.'
  },
  RATE_LIMITED: {
    title: 'Too Many Requests',
    message: 'Please wait a moment before trying again.'
  },
  
  // Default error
  UNKNOWN_ERROR: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.'
  }
}

// Error classification
export function classifyError(error: any): keyof typeof ERROR_MESSAGES {
  // Handle APIError instances
  if (error instanceof APIError) {
    switch (error.code) {
      case 'NetworkError':
      case 'ERR_NETWORK':
        return 'NETWORK_ERROR'
      case 'TimeoutError':
      case 'TIMEOUT':
        return 'TIMEOUT_ERROR'
      case 'UNAUTHORIZED':
        return 'UNAUTHORIZED'
      case 'FORBIDDEN':
        return 'FORBIDDEN'
      case 'TRIP_NOT_FOUND':
        return 'TRIP_NOT_FOUND'
      case 'INVALID_SHARE_CODE':
        return 'INVALID_SHARE_CODE'
      case 'ALREADY_PARTICIPANT':
        return 'ALREADY_PARTICIPANT'
      case 'FLIGHT_NOT_FOUND':
        return 'FLIGHT_NOT_FOUND'
      case 'FLIGHT_API_ERROR':
        return 'FLIGHT_API_ERROR'
      case 'SERVICE_UNAVAILABLE':
        return 'SERVICE_UNAVAILABLE'
      default:
        if (error.statusCode >= 500) return 'SERVER_ERROR'
        if (error.statusCode === 429) return 'RATE_LIMITED'
        return 'UNKNOWN_ERROR'
    }
  }

  // Handle ValidationError instances
  if (error instanceof ValidationError) {
    return 'VALIDATION_ERROR'
  }

  // Handle HTTP status codes
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode
    switch (status) {
      case 401:
        return 'UNAUTHORIZED'
      case 403:
        return 'FORBIDDEN'
      case 404:
        return 'TRIP_NOT_FOUND'
      case 408:
        return 'TIMEOUT_ERROR'
      case 429:
        return 'RATE_LIMITED'
      case 500:
      case 502:
      case 503:
      case 504:
        return 'SERVER_ERROR'
      default:
        return 'UNKNOWN_ERROR'
    }
  }

  // Handle common error patterns
  if (error.message) {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('connection')) {
      return 'NETWORK_ERROR'
    }
    if (message.includes('timeout')) {
      return 'TIMEOUT_ERROR'
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return 'UNAUTHORIZED'
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return 'FORBIDDEN'
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION_ERROR'
    }
    if (message.includes('required') || message.includes('missing')) {
      return 'REQUIRED_FIELD_MISSING'
    }
    if (message.includes('email')) {
      return 'INVALID_EMAIL'
    }
    if (message.includes('date') && message.includes('range')) {
      return 'INVALID_DATE_RANGE'
    }
    if (message.includes('flight number')) {
      return 'INVALID_FLIGHT_NUMBER'
    }
    if (message.includes('share code')) {
      return 'INVALID_SHARE_CODE'
    }
  }

  return 'UNKNOWN_ERROR'
}

// Get user-friendly error message
export function getUserFriendlyError(error: any) {
  const errorType = classifyError(error)
  const errorMessage = ERROR_MESSAGES[errorType]
  
  // For validation errors, try to extract field-specific messages
  if (error instanceof ValidationError && Object.keys(error.fieldErrors).length > 0) {
    const firstFieldError = Object.values(error.fieldErrors)[0]
    return {
      title: errorMessage.title,
      message: firstFieldError || errorMessage.message
    }
  }

  return errorMessage
}

// Error handler hook for React components
export function createErrorHandler(showError: (title: string, message?: string) => void) {
  return (error: any, context?: string) => {
    console.error(`Error in ${context || 'application'}:`, error)
    
    const { title, message } = getUserFriendlyError(error)
    showError(title, message)
  }
}

// Common error scenarios with specific messages
export const TRIP_ERRORS = {
  CREATION_FAILED: new APIError(
    'Failed to create trip',
    'TRIP_CREATION_FAILED'
  ),
  INVALID_SHARE_CODE: new APIError(
    'Invalid share code provided',
    'INVALID_SHARE_CODE'
  ),
  NOT_FOUND: new APIError(
    'Trip not found',
    'TRIP_NOT_FOUND'
  ),
  ALREADY_PARTICIPANT: new APIError(
    'User is already a participant',
    'ALREADY_PARTICIPANT'
  )
}

export const FLIGHT_ERRORS = {
  NOT_FOUND: new APIError(
    'Flight not found',
    'FLIGHT_NOT_FOUND'
  ),
  INVALID_NUMBER: new ValidationError(
    'Invalid flight number format',
    { flightNumber: 'Please enter a valid flight number (e.g., AA123)' }
  ),
  API_ERROR: new APIError(
    'Flight service unavailable',
    'FLIGHT_API_ERROR'
  )
}

export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: (field: string) => new ValidationError(
    `${field} is required`,
    { [field]: `${field} is required` }
  ),
  INVALID_EMAIL: new ValidationError(
    'Invalid email address',
    { email: 'Please enter a valid email address' }
  ),
  INVALID_DATE_RANGE: new ValidationError(
    'Invalid date range',
    { endDate: 'End date must be after start date' }
  ),
  TOO_SHORT: (field: string, min: number) => new ValidationError(
    `${field} is too short`,
    { [field]: `${field} must be at least ${min} characters` }
  ),
  TOO_LONG: (field: string, max: number) => new ValidationError(
    `${field} is too long`,
    { [field]: `${field} must be at most ${max} characters` }
  )
}

// Centralized error logging (can be extended to send to external services)
export function logError(error: any, context: string, userId?: string) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    userId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof APIError && {
        code: error.code,
        statusCode: error.statusCode,
        retryable: error.retryable
      }),
      ...(error instanceof ValidationError && {
        fieldErrors: error.fieldErrors
      })
    },
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
    url: typeof window !== 'undefined' ? window.location.href : 'Server'
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo)
  }

  // In production, you could send this to an error tracking service
  // like Sentry, Rollbar, or AWS CloudWatch
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to external service
    // sendToErrorTracking(errorInfo)
  }

  return errorInfo
}