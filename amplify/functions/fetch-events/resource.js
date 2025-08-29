import { defineFunction } from '@aws-amplify/backend';

export const fetchEventsFunction = defineFunction({
  name: 'fetch-events',
  timeoutSeconds: 30,
  environment: {
    TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY || '',
    SEATGEEK_CLIENT_ID: process.env.SEATGEEK_CLIENT_ID || '',
    SEATGEEK_CLIENT_SECRET: process.env.SEATGEEK_CLIENT_SECRET || '',
    PREDICTHQ_ACCESS_TOKEN: process.env.PREDICTHQ_ACCESS_TOKEN || '',
    SERPAPI_KEY: process.env.SERPAPI_KEY || '',
  },
});