import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import { fetchEventsFunction } from './functions/fetch-events/resource.js';

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