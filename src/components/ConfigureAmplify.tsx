'use client'

import { useEffect } from 'react'
import { Amplify } from 'aws-amplify'

export default function ConfigureAmplifyClientSide() {
  useEffect(() => {
    try {
      // Try to load amplify_outputs.json
      let outputs = {}
      try {
        outputs = require('../../amplify_outputs.json')
        console.log('Loaded amplify_outputs.json successfully')
      } catch (e) {
        console.error('CRITICAL: amplify_outputs.json not found!')
        console.error('This file should be generated during AWS Amplify deployment.')
        console.error('For local development, run: npx ampx sandbox')
        
        // Show user-friendly error
        if (typeof window !== 'undefined') {
          const errorMsg = 'Authentication system not configured. Please contact support.'
          console.error(errorMsg)
          // Don't configure Amplify with empty config - this causes auth errors
          return
        }
      }
      
      // Only configure if we have valid outputs
      if (outputs && Object.keys(outputs).length > 0) {
        Amplify.configure(outputs)
        console.log('Amplify configured successfully with:', {
          hasAuth: !!outputs.auth,
          hasData: !!outputs.data,
          hasStorage: !!outputs.storage
        })
      } else {
        console.error('Invalid amplify_outputs.json - empty configuration')
      }
    } catch (error) {
      console.error('Error configuring Amplify:', error)
    }
  }, [])
  
  return null
}