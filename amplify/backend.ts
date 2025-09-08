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

// Configure auth to disable unauthenticated access
const { cfnIdentityPool } = backend.auth.resources.cfnResources;

// Disable unauthenticated access to identity pool
if (cfnIdentityPool) {
  cfnIdentityPool.allowUnauthenticatedIdentities = false;
}