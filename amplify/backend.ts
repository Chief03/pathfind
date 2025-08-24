import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { fetchEventsFunction } from './functions/fetch-events/resource';

/**
 * Pathfind backend definition
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  fetchEventsFunction
});

// Add custom configurations
backend.addOutput({
  custom: {
    API: {
      endpoint: process.env.API_ENDPOINT || 'http://localhost:3001',
      region: process.env.AWS_REGION || 'us-east-1'
    }
  }
});