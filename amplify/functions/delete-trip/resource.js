import { defineFunction } from '@aws-amplify/backend';

export const deleteTripFunction = defineFunction({
  name: 'delete-trip',
  entry: './handler.ts',
  environment: {
    AMPLIFY_DATA_GRAPHQL_ENDPOINT: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT || '',
  },
  runtime: 18,
});