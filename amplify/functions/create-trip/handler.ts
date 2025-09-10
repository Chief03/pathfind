// Schema types will be available from the generated client
type Schema = any;
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { v4 as uuidv4 } from 'uuid';
import type { Handler } from 'aws-lambda';

// Configure Amplify
Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT || '',
        region: process.env.AWS_REGION || 'us-east-1',
        defaultAuthMode: 'iam',
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            sessionToken: process.env.AWS_SESSION_TOKEN || '',
          },
        }),
        clearCredentialsAndIdentityId: () => {
          /* noop */
        },
      },
    },
  }
);

const client = generateClient<Schema>({ authMode: 'iam' });

// Helper function to generate a 6-character trip code
function generateTripCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Creates a new trip with validated destinations and trip limit checking
 */
export const handler: Handler = async (event: any) => {
  const { 
    name, 
    departureCity, 
    destinationCity, 
    startDate, 
    endDate, 
    groupSize,
    description 
  } = event.arguments;

  try {
    // Get the authenticated user's ID from the event context
    const userId = event.identity?.sub;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Check user's current trip count and subscription limits
    const { data: userProfile } = await client.models.UserProfile.get({
      userId: userId
    });

    if (userProfile) {
      const currentTripCount = userProfile.tripCount || 0;
      const maxTrips = userProfile.maxTrips || 5;
      const subscriptionType = userProfile.subscriptionType || 'free';

      // Check if user has reached their trip limit
      if (currentTripCount >= maxTrips) {
        const error = {
          __typename: 'TripLimitError',
          message: `You have reached the maximum number of trips (${maxTrips}) for your ${subscriptionType} account. Please delete an existing trip or upgrade to premium to create more trips.`,
          currentCount: currentTripCount,
          maxTrips: maxTrips,
          subscriptionType: subscriptionType,
          requiresUpgrade: subscriptionType === 'free'
        };
        throw error;
      }
    }
    // First, validate destinations using our validation function
    const destinationValidations = [];
    
    // Validate destination city (required)
    const destValidation = await validateLocation(destinationCity);
    if (!destValidation.isValid) {
      throw new Error(`Destination city "${destinationCity}" is not a valid location. Please enter a real city name.`);
    }

    // Validate departure city if provided
    let depValidation = null;
    if (departureCity) {
      depValidation = await validateLocation(departureCity);
      if (!depValidation.isValid) {
        throw new Error(`Departure city "${departureCity}" is not a valid location. Please enter a real city name.`);
      }
    }

    // Create the trip with validated and normalized location data
    const tripData = {
      id: uuidv4(),
      name: name || 'New Trip',
      shareCode: generateTripCode(),
      destinationCity: destValidation.normalizedLocation,
      destinationCoords: JSON.stringify(destValidation.coordinates),
      departureCity: depValidation ? depValidation.normalizedLocation : null,
      departureCoords: depValidation ? JSON.stringify(depValidation.coordinates) : null,
      startDate,
      endDate,
      groupSize: groupSize || 2,
      description: description || null,
    };

    // Create the trip in the database
    const { data: trip, errors } = await client.models.Trip.create(tripData);

    if (errors) {
      console.error('Error creating trip:', errors);
      throw new Error('Failed to create trip');
    }

    // Update user's trip count after successful creation
    if (userProfile) {
      await client.models.UserProfile.update({
        userId: userId,
        tripCount: (userProfile.tripCount || 0) + 1
      });
    } else {
      // Create user profile if it doesn't exist
      await client.models.UserProfile.create({
        userId: userId,
        email: '', // This should be populated elsewhere
        firstName: '',
        lastName: '',
        tripCount: 1
      });
    }

    return {
      ...trip,
      destinationCoords: destValidation.coordinates,
      departureCoords: depValidation?.coordinates || null,
    };
  } catch (error: any) {
    console.error('Trip creation error:', error);
    throw error;
  }
};

/**
 * Validates a location using OpenStreetMap Nominatim API
 */
async function validateLocation(location: string) {
  if (!location || location.trim().length < 2) {
    return { isValid: false };
  }

  try {
    const cleanLocation = location.trim();
    
    const params = new URLSearchParams({
      q: cleanLocation,
      format: 'json',
      limit: '5',
      addressdetails: '1',
      countrycodes: 'us',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'User-Agent': 'Pathfind Trip Planner App',
        },
      }
    );

    if (!response.ok) {
      return { isValid: false };
    }

    const results = await response.json() as any[];

    // Filter for actual cities/towns
    const cityResults = results.filter(r => 
      r.type === 'city' || 
      r.type === 'town' || 
      r.type === 'administrative' ||
      (r.address && (r.address.city || r.address.town))
    );

    if (cityResults.length === 0) {
      return { isValid: false };
    }

    const bestMatch = cityResults[0];
    const city = bestMatch.address?.city || bestMatch.address?.town || cleanLocation;
    const state = bestMatch.address?.state || '';
    const normalizedLocation = state ? `${city}, ${state}` : city;

    return {
      isValid: true,
      normalizedLocation,
      city,
      state,
      coordinates: {
        lat: parseFloat(bestMatch.lat),
        lng: parseFloat(bestMatch.lon),
      },
      displayName: bestMatch.display_name,
    };
  } catch (error) {
    console.error('Location validation error:', error);
    return { isValid: false };
  }
}