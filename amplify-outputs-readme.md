# Amplify Outputs README

## Current Deployment Information
**Last Updated:** 2025-09-08  
**Sandbox Stack:** amplify-pathfind-abelinochinchilla-sandbox-3c0f6314df  
**Region:** us-east-1  
**AppSync API ID:** fmbvlcc3o5cnhd5suq5c56vf64  
**AppSync Endpoint:** https://algn7qn5bjhp5nqh3ffubfdclq.appsync-api.us-east-1.amazonaws.com/graphql

## DynamoDB Table Names

| Model Name | DynamoDB Table Name | Purpose |
|------------|-------------------|----------|
| Event | `Event-fmbvlcc3o5cnhd5suq5c56vf64-NONE` | External event data from APIs |
| Flight | `Flight-fmbvlcc3o5cnhd5suq5c56vf64-NONE` | Flight information for trips |
| ItineraryItem | `ItineraryItem-fmbvlcc3o5cnhd5suq5c56vf64-NONE` | Trip activities and events |
| Place | `Place-fmbvlcc3o5cnhd5suq5c56vf64-NONE` | Saved places for trips |
| TripParticipant | `TripParticipant-fmbvlcc3o5cnhd5suq5c56vf64-NONE` | People on trips |
| Trip | `Trip-fmbvlcc3o5cnhd5suq5c56vf64-NONE` | Main trip entity |
| UserProfile | `UserProfile-fmbvlcc3o5cnhd5suq5c56vf64-NONE` | Extended user information |

## How to Find Table Names (Manual Process)

### Method 1: From Sandbox Logs
1. Check the dev logger output for the AppSync endpoint:
   ```bash
   # Look for line like:
   # AppSync API endpoint = https://[API_ID].appsync-api.us-east-1.amazonaws.com/graphql
   ```

2. Extract the API ID from the endpoint URL (the part before `.appsync-api`)

### Method 2: Using AWS CLI

1. **Find the correct AppSync API:**
   ```bash
   # List all AppSync APIs
   aws appsync list-graphql-apis --region us-east-1 | jq '.graphqlApis[] | {name: .name, apiId: .apiId, endpoint: .uris.GRAPHQL}'
   
   # Look for the one with matching endpoint from your sandbox logs
   ```

2. **Get all DynamoDB table names:**
   ```bash
   # Replace API_ID with your actual API ID
   aws appsync list-data-sources --api-id fmbvlcc3o5cnhd5suq5c56vf64 --region us-east-1 | jq '.dataSources[] | select(.dynamodbConfig) | {name: .name, tableName: .dynamodbConfig.tableName}'
   ```

3. **Get a specific table (e.g., Flight):**
   ```bash
   aws appsync list-data-sources --api-id fmbvlcc3o5cnhd5suq5c56vf64 --region us-east-1 | jq '.dataSources[] | select(.name | contains("Flight")) | {name: .name, tableName: .dynamodbConfig.tableName}'
   ```

### Method 3: From CloudFormation Console
1. Go to AWS CloudFormation console
2. Find stack: `amplify-pathfind-abelinochinchilla-sandbox-*`
3. Navigate to Resources tab
4. Filter by "AWS::DynamoDB::Table"
5. Physical IDs are the actual table names

## Table Naming Convention

Amplify uses this pattern for DynamoDB table names:
```
[ModelName]-[AppSyncAPIID]-[Environment]
```

- **ModelName**: From your schema (Trip, Flight, etc.)
- **AppSyncAPIID**: Unique identifier for your AppSync API
- **Environment**: NONE for sandbox, or branch name for deployed environments

## Quick Commands for Future Reference

```bash
# Check current AWS profile
awswho

# If SSO token expired
awslogin

# List all DynamoDB tables
aws dynamodb list-tables --region us-east-1

# Describe a specific table
aws dynamodb describe-table --table-name Flight-fmbvlcc3o5cnhd5suq5c56vf64-NONE --region us-east-1

# Query items from Flight table (example)
aws dynamodb scan --table-name Flight-fmbvlcc3o5cnhd5suq5c56vf64-NONE --region us-east-1
```

## Notes for Future Sessions

- These table names are specific to the current sandbox deployment
- If sandbox is deleted and recreated, the API ID will change, thus changing all table names
- The pattern remains consistent, only the API ID portion changes
- Always check the AppSync endpoint from sandbox logs first to get the current API ID

## Flight Table Architecture Plan

The Flight table is designed to:
1. Store flight data fetched from external airline APIs
2. Cache airline operational data (departure/arrival times, gates, terminals)
3. Store user-specific data (confirmation codes, seat numbers, notes)
4. Support the GraphQL API for frontend queries

Current schema includes:
- flightNumber (required)
- airline (required)
- departureAirport, arrivalAirport (JSON)
- departureTime, arrivalTime (datetime)
- terminal, gate, confirmationCode
- direction (arrival/departure)
- addedByUserId, addedByUserName