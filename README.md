# 🗺️ PathFind - Collaborative Trip Planning Platform

A modern web application for planning trips with friends and family, built with Next.js, TypeScript, and AWS Amplify Gen 2.

## 🚀 Overview

PathFind solves the chaos of group travel planning by providing a centralized platform where multiple users can collaborate in real-time to plan trips, manage flights, create itineraries, and track budgets together.

## ✨ Key Features

### 🤝 **Collaborative Planning**
- Real-time trip planning with multiple participants
- 8-character share codes for easy trip joining
- Role-based access (creator, participant, viewer)

### ✈️ **Flight Management**
- Integration with airline APIs for real-time flight data
- Track arrival/departure flights for all participants
- Store personal details (seat numbers, confirmation codes)
- Automatic flight lookup by flight number

### 📅 **Itinerary Planning**
- Day-by-day event scheduling
- AI-powered activity suggestions based on destination
- Custom event creation with categories
- Integration with event APIs (Ticketmaster, SeatGeek)

### 📍 **Places Discovery**
- Save and organize must-visit locations
- Categorize by type (restaurants, attractions, hotels)
- Rate and track visited places

### 💰 **Budget Tracking**
- Shared expense management
- Category-based budgeting
- Per-person or group pot tracking modes

### 🚀 **Subscription & Trip Management**
- **Free Plan**: Up to 5 trips per user
- **Premium Plan**: Unlimited trips + advanced features
- Smart trip limit validation with upgrade prompts
- Easy trip deletion and management in My Trips page
- Real-time trip count tracking

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** AWS Amplify UI React
- **State Management:** React Context API

### Backend (AWS Amplify Gen 2)
- **API:** AWS AppSync (GraphQL)
- **Database:** DynamoDB
- **Authentication:** AWS Cognito
- **Functions:** AWS Lambda
- **Storage:** Amazon S3
- **Real-time:** AppSync Subscriptions

## 📁 Project Structure

```
pathfind/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/             # Utility functions and services
│   ├── contexts/        # React contexts
│   └── types/           # TypeScript type definitions
├── amplify/
│   ├── auth/            # Cognito authentication config
│   ├── data/            # GraphQL schema and DynamoDB models
│   ├── functions/       # Lambda functions
│   │   ├── create-trip/     # Trip creation with limit validation
│   │   ├── delete-trip/     # Trip deletion with count updates
│   │   ├── fetch-events/    # Event API integration
│   │   └── validate-destination/ # Location validation
│   └── storage/         # S3 storage config
├── public/              # Static assets
└── logs/               # Development logs (gitignored)
```

## 🚦 Getting Started

### Prerequisites
- Node.js 20+ 
- npm (not yarn/pnpm)
- AWS Account
- AWS CLI configured with appropriate credentials

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ChinchillaEnterprises/pathfind.git
   cd pathfind
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Deploy the Amplify sandbox:**
   ```bash
   npm run sandbox
   ```
   - Initial deployment takes 5-10 minutes
   - Creates all AWS resources (DynamoDB, AppSync, Cognito, etc.)
   - Watch for any Cognito UserPool attribute errors
   
   ⚠️ **Important Notes:**
   - **Current Status:** Sandbox has been deleted due to Cognito UserPool attribute conflicts
   - If you encounter UserPool attribute errors during updates, you'll need to delete and recreate the sandbox
   - UserPool attributes are immutable after creation - changes require full recreation
   - Use `npm run sandbox:delete` or manual CloudFormation stack deletion if needed

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## 📝 Available Scripts

```bash
npm run dev           # Start Next.js development server
npm run build         # Build for production
npm run start         # Start production server
npm run sandbox       # Deploy Amplify sandbox
npm run sandbox:delete # Delete Amplify sandbox
```

## 🏗️ Architecture

### Data Models
- **Trip** - Core entity for trip planning
- **Flight** - Flight information with airline API integration
- **TripParticipant** - Users participating in trips
- **ItineraryItem** - Activities and events
- **Place** - Saved locations
- **Event** - External event data from APIs
- **UserProfile** - Extended user information with subscription management
  - `subscriptionType`: 'free' | 'premium'
  - `tripCount`: Current number of trips created
  - `maxTrips`: Maximum trips allowed (5 for free, unlimited for premium)

### Flight Service Architecture
```
User Input → Lambda Function → External Airline API → DynamoDB → GraphQL API → Frontend
```

### Subscription & Trip Limit Architecture
```
Trip Creation → create-trip Lambda → Trip Count Validation → UserProfile Check → Success/Upgrade Modal
Trip Deletion → delete-trip Lambda → DynamoDB Trip Delete → UserProfile Trip Count Update
```

## 🔧 Development

### Subscription Plans

#### 🆓 **Free Plan**
- Up to 5 trips per user
- Basic trip planning features
- Standard support

#### ⭐ **Premium Plan ($9.99/month)**
- Unlimited trips
- Priority customer support
- Advanced trip analytics
- Custom trip templates
- Extended collaboration features

### Environment Variables
Create a `.env.local` file for local development:
```env
# Add any local environment variables here
```

### AWS Configuration
The project uses AWS Amplify Gen 2. Configuration files:
- `amplify/backend.ts` - Main backend configuration
- `amplify/data/resource.ts` - Data schema definition
- `amplify_outputs.json` - Generated configuration (gitignored)

### Testing
```bash
# No tests configured yet
# npm test
```

## 📚 Documentation

- [Amplify Outputs README](./amplify-outputs-readme.md) - DynamoDB table names and AWS resource details
- [AWS Amplify Gen 2 Docs](https://docs.amplify.aws/gen2)
- [Next.js Documentation](https://nextjs.org/docs)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run linting: `npm run lint`
4. Create a pull request

## 📄 License

This project is private and proprietary.

## 👥 Team

- Development Team at CHI

## 🆘 Support

For issues or questions, please contact the development team.

---

## ⚠️ Current Deployment Status

**Status:** 🟡 Ready for Fresh Deployment with New Features

**Last Updated:** September 10, 2025

### Recent Changes
- ✅ Added subscription management system
- ✅ Implemented trip limit validation (5 trips for free users)
- ✅ Created trip deletion functionality with count updates
- ✅ Enhanced My Trips page with better management
- ✅ Added subscription upgrade modal

### Known Issues
- Cognito UserPool attribute conflicts prevent sandbox updates
- Fresh deployment required for development with new UserProfile fields

### Next Steps
1. Run `npm run sandbox` for fresh deployment
2. Monitor for any UserPool attribute errors
3. New UserProfile fields will be created: `subscriptionType`, `tripCount`, `maxTrips`

## 📝 Recent Updates (v2.1.0)

### 🚀 **Trip Limit & Subscription System**
- **Free Plan**: Users limited to 5 trips maximum
- **Premium Plan**: Unlimited trips + advanced features
- **Smart Validation**: Trip creation blocked when limit reached
- **Upgrade Prompts**: Beautiful modal with pricing and features
- **Trip Management**: Delete functionality with proper count updates

### 🎯 **Enhanced User Experience**
- **My Trips Redesign**: Better trip cards with delete buttons
- **Subscription Status**: Visual badges showing Free/Premium status
- **Trip Counter**: Real-time display of current/max trips
- **Confirmation Dialogs**: Safe trip deletion with user confirmation

### ⚙️ **Backend Improvements**
- **create-trip Lambda**: Added trip limit validation logic
- **delete-trip Lambda**: New function for proper trip deletion
- **UserProfile Model**: Extended with subscription fields
- **Real-time Updates**: Trip counts updated immediately