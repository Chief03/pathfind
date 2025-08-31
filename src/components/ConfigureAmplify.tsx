'use client'

import { useEffect } from 'react'
import { Amplify } from 'aws-amplify'

export default function ConfigureAmplifyClientSide() {
  useEffect(() => {
    try {
      // Try to load amplify_outputs.json, fallback to empty config
      let outputs = {}
      try {
        outputs = require('../../amplify_outputs.json')
      } catch (e) {
        console.warn('amplify_outputs.json not found, using empty config for development')
        outputs = {
          version: "1.4",
          auth: {
            aws_region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
            user_pool_id: process.env.NEXT_PUBLIC_USER_POOL_ID || "",
            user_pool_client_id: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || "",
            identity_pool_id: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || ""
          },
          data: {
            aws_region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
            url: process.env.NEXT_PUBLIC_APPSYNC_URL || "",
            default_authorization_mode: "AMAZON_COGNITO_USER_POOLS"
          },
          storage: {
            aws_region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
            bucket_name: process.env.NEXT_PUBLIC_S3_BUCKET || ""
          }
        }
      }
      
      Amplify.configure(outputs)
      console.log('Amplify configured successfully')
    } catch (error) {
      console.error('Error configuring Amplify:', error)
    }
  }, [])
  
  return null
}