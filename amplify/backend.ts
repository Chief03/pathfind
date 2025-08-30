import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.ts';
// import { fetchEventsFunction } from './functions/fetch-events/resource.ts';

/**
 * Pathfind backend definition
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  // fetchEventsFunction
});

// Configure auth to disable unauthenticated access
const { cfnIdentityPool } = backend.auth.resources.cfnResources;

// Disable unauthenticated access to identity pool
if (cfnIdentityPool) {
  cfnIdentityPool.allowUnauthenticatedIdentities = false;
}

// Add custom configurations
backend.addOutput({
  custom: {
    API: {
      endpoint: process.env.API_ENDPOINT || 'http://localhost:3001',
      region: process.env.AWS_REGION || 'us-east-1'
    }
  }
});