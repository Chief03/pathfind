import { defineFunction } from '@aws-amplify/backend';

export const createTripFunction = defineFunction({
  name: 'create-trip',
  timeoutSeconds: 30,
  environment: {
    // Environment variables will be automatically injected for DynamoDB access
  },
});