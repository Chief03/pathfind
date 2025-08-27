import { a, defineData } from '@aws-amplify/backend';
// Temporarily disabled for auth testing
// import { fetchEventsFunction } from '../functions/fetch-events/resource.ts';
// import { validateDestinationFunction } from '../functions/validate-destination/resource.js';
// import { createTripFunction } from '../functions/create-trip/resource.js';

/*========== The application schema ==========*/
const schema = a.schema({
  // Trip model - the main entity for trip planning
  Trip: a
    .model({
      name: a.string().required(),
      shareCode: a.string().required(),
      departureCity: a.string(),
      destinationCity: a.string().required(),
      departureCoords: a.json(),
      destinationCoords: a.json(),
      startDate: a.date().required(),
      endDate: a.date().required(),
      groupSize: a.integer().default(2),
      description: a.string(),
      participants: a.hasMany('TripParticipant', 'tripId'),
      flights: a.hasMany('Flight', 'tripId'),
      itineraryItems: a.hasMany('ItineraryItem', 'tripId'),
      places: a.hasMany('Place', 'tripId'),
    })
    .authorization(allow => [
      allow.owner(),
      allow.authenticated().to(['read']),
      allow.publicApiKey().to(['read']),
    ])
    .secondaryIndexes(index => [
      index('shareCode').sortKeys(['startDate']).queryField('tripByShareCode'),
    ]),

  // Trip Participant - people on the trip
  TripParticipant: a
    .model({
      tripId: a.id().required(),
      trip: a.belongsTo('Trip', 'tripId'),
      userId: a.string(),
      email: a.email().required(),
      name: a.string().required(),
      role: a.enum(['creator', 'participant', 'viewer']),
      joinedAt: a.datetime(),
    })
    .authorization(allow => [
      allow.owner(),
      allow.authenticated().to(['read']),
    ]),

  // Flight model - flight information
  Flight: a
    .model({
      tripId: a.id().required(),
      trip: a.belongsTo('Trip', 'tripId'),
      airline: a.string().required(),
      flightNumber: a.string().required(),
      departureAirport: a.json().required(),
      arrivalAirport: a.json().required(),
      departureTime: a.datetime().required(),
      arrivalTime: a.datetime().required(),
      terminal: a.string(),
      gate: a.string(),
      confirmationCode: a.string(),
      notes: a.string(),
      direction: a.enum(['arrival', 'departure']),
      addedByUserId: a.string(),
      addedByUserName: a.string(),
    })
    .authorization(allow => [
      allow.owner(),
      allow.authenticated().to(['read', 'create', 'update']),
    ]),

  // Itinerary Item - things to do on the trip
  ItineraryItem: a
    .model({
      tripId: a.id().required(),
      trip: a.belongsTo('Trip', 'tripId'),
      title: a.string().required(),
      location: a.string().required(),
      date: a.date().required(),
      time: a.time(),
      price: a.float(),
      description: a.string(),
      category: a.enum(['Event', 'Activity', 'Restaurant', 'Transportation', 'Accommodation', 'Other']),
      eventSource: a.string(),
      eventId: a.string(),
      eventUrl: a.url(),
      imageUrl: a.url(),
      addedBy: a.string(),
    })
    .authorization(allow => [
      allow.owner(),
      allow.authenticated().to(['read', 'create', 'update']),
    ]),

  // Place - saved places for the trip
  Place: a
    .model({
      tripId: a.id().required(),
      trip: a.belongsTo('Trip', 'tripId'),
      name: a.string().required(),
      address: a.string(),
      coordinates: a.json(),
      category: a.string(),
      rating: a.float(),
      priceLevel: a.integer(),
      notes: a.string(),
      placeId: a.string(),
    })
    .authorization(allow => [
      allow.owner(),
      allow.authenticated().to(['read', 'create', 'update']),
    ]),

  // Event Discovery - fetched from external APIs
  Event: a
    .model({
      eventId: a.string().required(),
      name: a.string().required(),
      category: a.string(),
      venue: a.string().required(),
      address: a.string(),
      date: a.date().required(),
      time: a.time(),
      price: a.string(),
      description: a.string(),
      imageUrl: a.url(),
      ticketUrl: a.url(),
      source: a.string(),
      coordinates: a.json(),
      isPopular: a.boolean(),
      city: a.string().required(),
    })
    .authorization(allow => [
      allow.publicApiKey().to(['read']),
      allow.authenticated().to(['read']),
    ])
    .secondaryIndexes(index => [
      index('city').sortKeys(['date', 'time']).queryField('eventsByCity'),
    ]),

  // Custom queries and mutations - temporarily disabled for auth testing
  
  // // Validate a destination to ensure it's a real city
  // validateDestination: a
  //   .query()
  //   .arguments({
  //     destination: a.string().required(),
  //   })
  //   .returns(a.json())
  //   .authorization(allow => [allow.publicApiKey(), allow.authenticated()])
  //   .handler(a.handler.function(validateDestinationFunction)),

  // // Create a trip with validated destinations
  // createValidatedTrip: a
  //   .mutation()
  //   .arguments({
  //     name: a.string().required(),
  //     departureCity: a.string(),
  //     destinationCity: a.string().required(),
  //     startDate: a.date().required(),
  //     endDate: a.date().required(),
  //     groupSize: a.integer(),
  //     description: a.string(),
  //   })
  //   .returns(a.ref('Trip'))
  //   .authorization(allow => [allow.publicApiKey(), allow.authenticated()])
  //   .handler(a.handler.function(createTripFunction)),

  // // Fetch events for a city
  // fetchEvents: a
  //   .query()
  //   .arguments({
  //     city: a.string().required(),
  //     startDate: a.string().required(),
  //     endDate: a.string().required(),
  //   })
  //   .returns(a.json())
  //   .authorization(allow => [allow.publicApiKey(), allow.authenticated()])
  //   .handler(a.handler.function(fetchEventsFunction)),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});