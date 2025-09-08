'use client'

import { Amplify } from 'aws-amplify'

// Dynamically import the config to handle missing file gracefully
let amplifyConfigured = false

async function configureAmplify() {
  if (amplifyConfigured) return
  
  try {
    const outputs = await import('../../amplify_outputs.json')
    
    if (outputs && Object.keys(outputs).length > 0) {
      Amplify.configure(outputs.default || outputs)
      amplifyConfigured = true
      console.log('Amplify configured successfully with:', {
        hasAuth: !!(outputs.auth || outputs.default?.auth),
        hasData: !!(outputs.data || outputs.default?.data),
        hasStorage: !!(outputs.storage || outputs.default?.storage)
      })
    } else {
      console.error('Invalid amplify_outputs.json - empty configuration')
    }
  } catch (error) {
    console.error('CRITICAL: amplify_outputs.json not found!')
    console.error('This file should be generated during AWS Amplify deployment.')
    console.error('For local development, run: npx ampx sandbox')
    
    // In production, this should not happen as the file is generated during build
    if (process.env.NODE_ENV === 'production') {
      console.error('Production build missing amplify_outputs.json - deployment may have failed')
    }
  }
}

// Configure immediately when module loads
if (typeof window !== 'undefined') {
  configureAmplify()
}

export default function ConfigureAmplifyClientSide() {
  // This component ensures Amplify is configured on the client side
  // The actual configuration happens at module load time
  return null
}