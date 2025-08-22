import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/create-trip';
import { v4 as uuidv4 } from 'uuid';

// Configure Amplify
Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: env.AMPLIFY_DATA_GRAPHQL_ENDPOINT,
        region: env.AWS_REGION,
        defaultAuthMode: 'iam',
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
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
 * Creates a new trip with validated destinations
 */
export const handler: Schema["createValidatedTrip"]["functionHandler"] = async (event) => {
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

    const results: any[] = await response.json();

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