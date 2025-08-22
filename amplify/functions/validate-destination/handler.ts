import type { Schema } from '../../data/resource';

interface GeocodingResult {
  place_id: string;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
  address?: {
    city?: string;
    town?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Validates if a destination is a real city/location
 * Returns normalized location data if valid, throws error if invalid
 */
export const handler: Schema["validateDestination"]["functionHandler"] = async (event) => {
  const { destination } = event.arguments;
  
  if (!destination || destination.trim().length < 2) {
    throw new Error('Destination must be at least 2 characters long');
  }

  try {
    // Clean up the input
    const cleanDestination = destination.trim();
    
    // Call OpenStreetMap Nominatim API (free, no key required)
    const params = new URLSearchParams({
      q: cleanDestination,
      format: 'json',
      limit: '5',
      addressdetails: '1',
      countrycodes: 'us', // Limit to US cities for now
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'User-Agent': 'Pathfind Trip Planner App', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to validate destination');
    }

    const results: GeocodingResult[] = await response.json();

    // Filter for actual cities/towns (not just any location)
    const cityResults = results.filter(r => 
      r.type === 'city' || 
      r.type === 'town' || 
      r.type === 'administrative' ||
      (r.address && (r.address.city || r.address.town))
    );

    if (cityResults.length === 0) {
      throw new Error(`"${destination}" is not a valid city. Please enter a real city name.`);
    }

    // Get the best match (highest importance score)
    const bestMatch = cityResults[0];
    
    // Extract city and state information
    const city = bestMatch.address?.city || 
                 bestMatch.address?.town || 
                 cleanDestination;
    const state = bestMatch.address?.state || '';
    
    // Create normalized location string
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
  } catch (error: any) {
    // Re-throw validation errors
    if (error.message.includes('not a valid city')) {
      throw error;
    }
    
    // For API errors, provide a generic message
    throw new Error('Unable to validate destination. Please try again.');
  }
};