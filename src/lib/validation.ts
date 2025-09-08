import type { TripFormData, FlightFormData, ItineraryFormData } from '@/types/models'

// Validation result type
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  fieldErrors: Record<string, string>
}

// Generic validation helper
export function validate(value: any, rules: ValidationRule[]): { isValid: boolean; error?: string } {
  for (const rule of rules) {
    const result = rule.validate(value)
    if (!result.isValid) {
      return { isValid: false, error: result.message }
    }
  }
  return { isValid: true }
}

// Validation rules
interface ValidationRule {
  validate: (value: any) => { isValid: boolean; message?: string }
}

export const required = (message = 'This field is required'): ValidationRule => ({
  validate: (value) => ({
    isValid: value !== null && value !== undefined && value !== '' && value !== 0,
    message: value === null || value === undefined || value === '' ? message : undefined
  })
})

export const minLength = (min: number, message?: string): ValidationRule => ({
  validate: (value) => ({
    isValid: !value || value.length >= min,
    message: value && value.length < min ? (message || `Must be at least ${min} characters`) : undefined
  })
})

export const maxLength = (max: number, message?: string): ValidationRule => ({
  validate: (value) => ({
    isValid: !value || value.length <= max,
    message: value && value.length > max ? (message || `Must be at most ${max} characters`) : undefined
  })
})

export const isEmail = (message = 'Please enter a valid email address'): ValidationRule => ({
  validate: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return {
      isValid: !value || emailRegex.test(value),
      message: value && !emailRegex.test(value) ? message : undefined
    }
  }
})

export const isDate = (message = 'Please enter a valid date'): ValidationRule => ({
  validate: (value) => {
    if (!value) return { isValid: true }
    const date = new Date(value)
    return {
      isValid: !isNaN(date.getTime()),
      message: isNaN(date.getTime()) ? message : undefined
    }
  }
})

export const isAfter = (compareDate: string, message?: string): ValidationRule => ({
  validate: (value) => {
    if (!value || !compareDate) return { isValid: true }
    const date1 = new Date(value)
    const date2 = new Date(compareDate)
    return {
      isValid: date1 > date2,
      message: date1 <= date2 ? (message || 'Date must be after the start date') : undefined
    }
  }
})

export const isNumeric = (message = 'Please enter a valid number'): ValidationRule => ({
  validate: (value) => {
    if (!value) return { isValid: true }
    return {
      isValid: !isNaN(Number(value)) && isFinite(Number(value)),
      message: (isNaN(Number(value)) || !isFinite(Number(value))) ? message : undefined
    }
  }
})

export const min = (minimum: number, message?: string): ValidationRule => ({
  validate: (value) => {
    if (!value) return { isValid: true }
    const num = Number(value)
    return {
      isValid: num >= minimum,
      message: num < minimum ? (message || `Must be at least ${minimum}`) : undefined
    }
  }
})

export const max = (maximum: number, message?: string): ValidationRule => ({
  validate: (value) => {
    if (!value) return { isValid: true }
    const num = Number(value)
    return {
      isValid: num <= maximum,
      message: num > maximum ? (message || `Must be at most ${maximum}`) : undefined
    }
  }
})

// Trip validation
export function validateTrip(data: Partial<TripFormData>): ValidationResult {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Name validation
  const nameValidation = validate(data.name, [
    required('Trip name is required'),
    minLength(2, 'Trip name must be at least 2 characters'),
    maxLength(100, 'Trip name must be at most 100 characters')
  ])
  if (!nameValidation.isValid && nameValidation.error) {
    fieldErrors.name = nameValidation.error
    errors.push(nameValidation.error)
  }

  // Destination validation
  const destinationValidation = validate(data.destinationCity, [
    required('Destination city is required'),
    minLength(2, 'Destination must be at least 2 characters')
  ])
  if (!destinationValidation.isValid && destinationValidation.error) {
    fieldErrors.destinationCity = destinationValidation.error
    errors.push(destinationValidation.error)
  }

  // Date validation
  const startDateValidation = validate(data.startDate, [
    required('Start date is required'),
    isDate('Please enter a valid start date')
  ])
  if (!startDateValidation.isValid && startDateValidation.error) {
    fieldErrors.startDate = startDateValidation.error
    errors.push(startDateValidation.error)
  }

  const endDateValidation = validate(data.endDate, [
    required('End date is required'),
    isDate('Please enter a valid end date'),
    isAfter(data.startDate || '', 'End date must be after start date')
  ])
  if (!endDateValidation.isValid && endDateValidation.error) {
    fieldErrors.endDate = endDateValidation.error
    errors.push(endDateValidation.error)
  }

  // Group size validation
  const groupSizeValidation = validate(data.groupSize, [
    required('Group size is required'),
    isNumeric('Group size must be a number'),
    min(1, 'Group size must be at least 1'),
    max(50, 'Group size cannot exceed 50 people')
  ])
  if (!groupSizeValidation.isValid && groupSizeValidation.error) {
    fieldErrors.groupSize = groupSizeValidation.error
    errors.push(groupSizeValidation.error)
  }

  // Budget validation (optional)
  if (data.budget !== undefined) {
    const budgetValidation = validate(data.budget, [
      isNumeric('Budget must be a number'),
      min(0, 'Budget cannot be negative')
    ])
    if (!budgetValidation.isValid && budgetValidation.error) {
      fieldErrors.budget = budgetValidation.error
      errors.push(budgetValidation.error)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors
  }
}

// Flight validation
export function validateFlight(data: Partial<FlightFormData>): ValidationResult {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Required fields
  const requiredFields: (keyof FlightFormData)[] = [
    'airline', 'flightNumber', 'departureAirport', 'arrivalAirport', 
    'departureTime', 'arrivalTime', 'direction'
  ]

  requiredFields.forEach(field => {
    const validation = validate(data[field], [required(`${field} is required`)])
    if (!validation.isValid && validation.error) {
      fieldErrors[field] = validation.error
      errors.push(validation.error)
    }
  })

  // Flight number format validation
  if (data.flightNumber) {
    const flightNumberRegex = /^[A-Z]{2,3}[0-9]{1,4}$/i
    if (!flightNumberRegex.test(data.flightNumber)) {
      const error = 'Flight number format should be like AA123 or ABC1234'
      fieldErrors.flightNumber = error
      errors.push(error)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors
  }
}

// Itinerary validation
export function validateItinerary(data: Partial<ItineraryFormData>): ValidationResult {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Title validation
  const titleValidation = validate(data.title, [
    required('Title is required'),
    minLength(2, 'Title must be at least 2 characters'),
    maxLength(200, 'Title must be at most 200 characters')
  ])
  if (!titleValidation.isValid && titleValidation.error) {
    fieldErrors.title = titleValidation.error
    errors.push(titleValidation.error)
  }

  // Location validation
  const locationValidation = validate(data.location, [
    required('Location is required'),
    minLength(2, 'Location must be at least 2 characters')
  ])
  if (!locationValidation.isValid && locationValidation.error) {
    fieldErrors.location = locationValidation.error
    errors.push(locationValidation.error)
  }

  // Date validation
  const dateValidation = validate(data.date, [
    required('Date is required'),
    isDate('Please enter a valid date')
  ])
  if (!dateValidation.isValid && dateValidation.error) {
    fieldErrors.date = dateValidation.error
    errors.push(dateValidation.error)
  }

  // Price validation (optional)
  if (data.price !== undefined) {
    const priceValidation = validate(data.price, [
      isNumeric('Price must be a number'),
      min(0, 'Price cannot be negative')
    ])
    if (!priceValidation.isValid && priceValidation.error) {
      fieldErrors.price = priceValidation.error
      errors.push(priceValidation.error)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors
  }
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Check if a date is in the future
export function isFutureDate(date: string): boolean {
  const inputDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return inputDate >= today
}

// Check if end date is after start date
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return end > start
}