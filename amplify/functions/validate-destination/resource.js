import { defineFunction } from '@aws-amplify/backend';

export const validateDestinationFunction = defineFunction({
  name: 'validate-destination',
  timeoutSeconds: 30,
  environment: {
    // Using OpenStreetMap's Nominatim API (free, no API key required)
    GEOCODING_API_URL: 'https://nominatim.openstreetmap.org/search',
  },
});