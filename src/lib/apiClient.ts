import { generateClient } from 'aws-amplify/data'
import type { Schema } from '@/../../amplify/data/resource'

// Retry configuration
interface RetryConfig {
  maxAttempts: number
  delayMs: number
  backoffMultiplier: number
  maxDelayMs: number
  retryableErrors: string[]
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
  retryableErrors: [
    'NetworkError',
    'TimeoutError',
    'ServiceUnavailable',
    'InternalServerError',
    'ThrottledException',
    'TooManyRequestsException'
  ]
}

// Custom error types
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string> = {}
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Sleep utility for delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Check if error is retryable
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false
  
  // Check error code/name
  if (retryableErrors.includes(error.name) || retryableErrors.includes(error.code)) {
    return true
  }
  
  // Check HTTP status codes
  if (error.statusCode || error.status) {
    const status = error.statusCode || error.status
    return status >= 500 || status === 429 || status === 408
  }
  
  // Check for network errors
  if (error.message) {
    const message = error.message.toLowerCase()
    return message.includes('network') || 
           message.includes('timeout') || 
           message.includes('connection')
  }
  
  return false
}

// Retry wrapper function
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName: string = 'API call'
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: any
  let delay = finalConfig.delayMs

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        break
      }
      
      // Check if error is retryable
      if (!isRetryableError(error, finalConfig.retryableErrors)) {
        console.warn(`${operationName} failed with non-retryable error:`, error)
        throw error
      }
      
      console.warn(
        `${operationName} attempt ${attempt} failed, retrying in ${delay}ms:`, 
        error.message || error
      )
      
      // Wait before retry
      await sleep(delay)
      
      // Exponential backoff with max delay
      delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs)
    }
  }
  
  // All attempts failed
  throw new APIError(
    `${operationName} failed after ${finalConfig.maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`,
    lastError?.code || 'MAX_RETRIES_EXCEEDED',
    lastError?.statusCode,
    false
  )
}

// Enhanced API client with retry logic
export class EnhancedAPIClient {
  private client: ReturnType<typeof generateClient<Schema>>
  private retryConfig: RetryConfig

  constructor(
    client: ReturnType<typeof generateClient<Schema>>, 
    retryConfig: Partial<RetryConfig> = {}
  ) {
    this.client = client
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  }

  // Create operations with retry
  async createTrip(data: any) {
    return withRetry(
      () => this.client.models.Trip.create(data),
      this.retryConfig,
      'Create Trip'
    )
  }

  async getTrip(id: string) {
    return withRetry(
      () => this.client.models.Trip.get({ id }),
      this.retryConfig,
      'Get Trip'
    )
  }

  async listTrips(filter?: any) {
    return withRetry(
      () => this.client.models.Trip.list(filter ? { filter } : undefined),
      this.retryConfig,
      'List Trips'
    )
  }

  async updateTrip(id: string, data: any) {
    return withRetry(
      () => this.client.models.Trip.update({ id, ...data }),
      this.retryConfig,
      'Update Trip'
    )
  }

  async deleteTrip(id: string) {
    return withRetry(
      () => this.client.models.Trip.delete({ id }),
      this.retryConfig,
      'Delete Trip'
    )
  }

  // Trip Participant operations
  async createTripParticipant(data: any) {
    return withRetry(
      () => this.client.models.TripParticipant.create(data),
      this.retryConfig,
      'Create Trip Participant'
    )
  }

  async listTripParticipants(filter: any) {
    return withRetry(
      () => this.client.models.TripParticipant.list({ filter }),
      this.retryConfig,
      'List Trip Participants'
    )
  }

  // Flight operations
  async createFlight(data: any) {
    return withRetry(
      () => this.client.models.Flight.create(data),
      this.retryConfig,
      'Create Flight'
    )
  }

  async listFlights(filter: any) {
    return withRetry(
      () => this.client.models.Flight.list({ filter }),
      this.retryConfig,
      'List Flights'
    )
  }

  async updateFlight(id: string, data: any) {
    return withRetry(
      () => this.client.models.Flight.update({ id, ...data }),
      this.retryConfig,
      'Update Flight'
    )
  }

  // Itinerary operations
  async createItineraryItem(data: any) {
    return withRetry(
      () => this.client.models.ItineraryItem.create(data),
      this.retryConfig,
      'Create Itinerary Item'
    )
  }

  async listItineraryItems(filter: any) {
    return withRetry(
      () => this.client.models.ItineraryItem.list({ filter }),
      this.retryConfig,
      'List Itinerary Items'
    )
  }

  // Place operations
  async createPlace(data: any) {
    return withRetry(
      () => this.client.models.Place.create(data),
      this.retryConfig,
      'Create Place'
    )
  }

  async listPlaces(filter: any) {
    return withRetry(
      () => this.client.models.Place.list({ filter }),
      this.retryConfig,
      'List Places'
    )
  }

  // Chat operations
  async sendChatMessage(data: any) {
    return withRetry(
      () => this.client.mutations.sendChatMessage(data),
      { ...this.retryConfig, maxAttempts: 2 }, // Fewer retries for real-time features
      'Send Chat Message'
    )
  }

  async getChatMessages(tripId: string, limit?: number, nextToken?: string) {
    return withRetry(
      () => this.client.queries.getChatMessages({ tripId, limit, nextToken }),
      this.retryConfig,
      'Get Chat Messages'
    )
  }

  // Custom queries with retry
  async customQuery<T>(
    queryFn: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return withRetry(
      queryFn,
      { ...this.retryConfig, ...customConfig },
      operationName
    )
  }
}

// Create singleton instance
let apiClientInstance: EnhancedAPIClient | null = null

export function getAPIClient(): EnhancedAPIClient | null {
  return apiClientInstance
}

export function initializeAPIClient(client: ReturnType<typeof generateClient<Schema>>): void {
  if (!apiClientInstance) {
    apiClientInstance = new EnhancedAPIClient(client)
  }
}

// Utility function for manual retry of any async operation
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
  operationName: string = 'Operation'
): Promise<T> {
  return withRetry(
    operation,
    { maxAttempts, delayMs, backoffMultiplier: 2, maxDelayMs: 30000, retryableErrors: [] },
    operationName
  )
}

// Circuit breaker pattern for additional resilience
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private isOpen = false

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.isOpen = false
        this.failureCount = 0
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await operation()
      this.failureCount = 0
      return result
    } catch (error) {
      this.failureCount++
      this.lastFailureTime = Date.now()
      
      if (this.failureCount >= this.threshold) {
        this.isOpen = true
      }
      
      throw error
    }
  }
}