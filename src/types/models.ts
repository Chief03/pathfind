// Generated types from Amplify schema
// These interfaces match the data models defined in amplify/data/resource.ts

export interface Trip {
  id: string
  name: string
  shareCode: string
  departureCity?: string
  destinationCity: string
  departureCoords?: any
  destinationCoords?: any
  startDate: string
  endDate: string
  groupSize?: number
  description?: string
  budget?: number
  currency?: string
  currentSpend?: number
  budgetAlertThreshold?: number
  tripPreferences?: any
  weatherAlerts?: boolean
  visibility?: 'private' | 'friends' | 'public'
  isTemplate?: boolean
  templatePrice?: number
  templateCategory?: string
  coverPhoto?: string
  likes?: number
  views?: number
  tags?: string[]
  featured?: boolean
  owner?: string
  createdAt?: string
  updatedAt?: string
}

export interface TripParticipant {
  id: string
  tripId: string
  trip?: Trip
  userId?: string
  email: string
  name: string
  role?: 'creator' | 'participant' | 'viewer'
  joinedAt?: string
  owner?: string
  createdAt?: string
  updatedAt?: string
}

export interface Flight {
  id: string
  tripId: string
  trip?: Trip
  airline: string
  flightNumber: string
  departureAirport: any
  arrivalAirport: any
  departureTime: string
  arrivalTime: string
  terminal?: string
  gate?: string
  confirmationCode?: string
  notes?: string
  direction?: 'arrival' | 'departure'
  addedByUserId?: string
  addedByUserName?: string
  status?: 'scheduled' | 'delayed' | 'cancelled' | 'departed' | 'arrived'
  actualDepartureTime?: string
  actualArrivalTime?: string
  delayMinutes?: number
  seatNumbers?: string[]
  isGroupFlight?: boolean
  passengerIds?: string[]
  lastUpdated?: string
  trackingId?: string
  owner?: string
  createdAt?: string
  updatedAt?: string
}

export interface ItineraryItem {
  id: string
  tripId: string
  trip?: Trip
  title: string
  location: string
  date: string
  time?: string
  price?: number
  description?: string
  category?: 'Event' | 'Activity' | 'Restaurant' | 'Transportation' | 'Accommodation' | 'Other'
  eventSource?: string
  eventId?: string
  eventUrl?: string
  imageUrl?: string
  addedBy?: string
  owner?: string
  createdAt?: string
  updatedAt?: string
}

export interface Place {
  id: string
  tripId: string
  trip?: Trip
  name: string
  address?: string
  coordinates?: { lat: number; lng: number }
  category?: string
  rating?: number
  priceLevel?: number
  notes?: string
  placeId?: string
  owner?: string
  createdAt?: string
  updatedAt?: string
}

export interface Expense {
  id: string
  tripId: string
  trip?: Trip
  category?: 'flight' | 'accommodation' | 'food' | 'transport' | 'activity' | 'shopping' | 'other'
  amount: number
  currency?: string
  description: string
  date: string
  paidBy?: string
  splitAmong?: string[]
  receiptUrl?: string
  notes?: string
  isEstimate?: boolean
  owner?: string
  createdAt?: string
  updatedAt?: string
}

export interface ChatMessage {
  id: string
  tripId: string
  userId: string
  userName: string
  userAvatar?: string
  message: string
  type?: 'text' | 'image' | 'voice' | 'system' | 'location'
  attachmentUrl?: string
  mentions?: string[]
  replyToId?: string
  edited?: boolean
  editedAt?: string
  deleted?: boolean
  reactions?: Record<string, string[]>
  metadata?: any
  createdAt?: string
  updatedAt?: string
}

export interface UserPresence {
  id: string
  tripId: string
  userId: string
  userName: string
  userAvatar?: string
  status?: 'online' | 'away' | 'offline'
  lastSeen?: string
  currentPage?: string
  cursorPosition?: { x: number; y: number; elementId?: string }
  isTyping?: boolean
  typingIn?: string
  device?: string
  color?: string
  createdAt?: string
  updatedAt?: string
}

// Extended Trip type with relations
export interface TripWithRelations extends Trip {
  participants?: TripParticipant[]
  flights?: Flight[]
  itineraryItems?: ItineraryItem[]
  places?: Place[]
  expenses?: Expense[]
}

// Form input types
export interface TripFormData {
  name: string
  destinationCity: string
  departureCity?: string
  startDate: string
  endDate: string
  groupSize: number
  description?: string
  budget?: number
}

export interface FlightFormData {
  airline: string
  flightNumber: string
  departureAirport: string
  arrivalAirport: string
  departureTime: string
  arrivalTime: string
  direction: 'arrival' | 'departure'
  notes?: string
}

export interface ItineraryFormData {
  title: string
  location: string
  date: string
  time?: string
  price?: number
  description?: string
  category?: 'Event' | 'Activity' | 'Restaurant' | 'Transportation' | 'Accommodation' | 'Other'
}