// Generated schema types for Amplify Data
export type Schema = {
  models: {
    Trip: {
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
      createdAt?: string
      updatedAt?: string
    }
    
    Flight: {
      id: string
      tripId: string
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
      createdAt?: string
      updatedAt?: string
    }
    
    ItineraryItem: {
      id: string
      tripId: string
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
      createdAt?: string
      updatedAt?: string
    }
    
    Place: {
      id: string
      tripId: string
      name: string
      address?: string
      coordinates?: any
      category?: string
      rating?: number
      priceLevel?: number
      notes?: string
      placeId?: string
      createdAt?: string
      updatedAt?: string
    }
    
    Budget: {
      id: string
      tripId: string
      category: string
      amount: number
      currency?: string
      notes?: string
      createdAt?: string
      updatedAt?: string
    }
  }
  
  queries: {
    validateDestination: {
      functionHandler: (event: {
        arguments: {
          destination: string
        }
      }) => Promise<any>
    }
    
    fetchEvents: {
      functionHandler: (event: {
        arguments: {
          city: string
          startDate: string
          endDate: string
        }
      }) => Promise<any>
    }
  }
  
  mutations: {
    createValidatedTrip: {
      functionHandler: (event: {
        arguments: {
          name: string
          departureCity?: string
          destinationCity: string
          startDate: string
          endDate: string
          groupSize?: number
          description?: string
        }
      }) => Promise<Schema['models']['Trip']>
    }
  }
}