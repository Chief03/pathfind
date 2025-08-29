import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'pathfindStorage',
  access: (allow) => ({
    'trip-images/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read'])
    ],
    'event-images/*': [
      allow.authenticated.to(['read']),
      allow.guest.to(['read'])
    ],
    'user-uploads/*': [
      allow.entity('identity').to(['read', 'write', 'delete'])
    ],
  })
});