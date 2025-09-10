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
- **NEW:** Real-time flight data via Amadeus GDS integration
- **NEW:** Automatic flight lookup - just enter flight number (e.g., "AA123")
- Auto-populate airline, airports, times, and terminals
- Track arrival/departure flights for all participants
- Store personal details (seat numbers, confirmation codes)

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

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** AWS Amplify UI React
- **State Management:** React Context API
- **API Integration:** Amadeus GDS for flight data

### Backend (AWS Amplify Gen 2)
- **API:** AWS AppSync (GraphQL)
- **Database:** DynamoDB
- **Authentication:** AWS Cognito
- **External APIs:** Amadeus Flight API
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
   - Sandbox deployment is currently stable and working
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
- **UserProfile** - Extended user information

### Flight Service Architecture

```
User Input → Frontend Form → /api/flight-lookup → Amadeus API
                                                   ↓
DynamoDB ← Save Flight Data ← Enriched Response ←
```

#### Amadeus Integration
- **Test Environment:** 500 free API calls/month
- **Production Cost:** ~$0.003 per API call
- **Supported Airlines:** AS, UA (limited AA, DL in test)
- **Data Available:** Times, airports, terminals, aircraft type

## 🔧 Development

### Environment Variables
Create a `.env` file in the root directory:
```env
# Amadeus API Credentials
AMADEUS_CLIENT_ID=your_client_id_here
AMADEUS_CLIENT_SECRET=your_client_secret_here
```

Get your Amadeus credentials at: https://developers.amadeus.com/

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

### Project Documentation
- [Session Summary](./context/session-summary.md) - Latest development session overview
- [Amadeus Integration Guide](./context/amadeus-integration.md) - Flight API integration details
- [UI/UX Improvements](./context/ui-improvements.md) - Recent interface enhancements
- [Amplify Outputs README](./amplify-outputs-readme.md) - DynamoDB table names and AWS resource details

### External Documentation
- [AWS Amplify Gen 2 Docs](https://docs.amplify.aws/gen2)
- [Next.js Documentation](https://nextjs.org/docs)
- [Amadeus API Documentation](https://developers.amadeus.com/)

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

## ✅ Current Status

**Status:** 🟢 Development Active

**Last Updated:** September 10, 2025

### Recent Updates
- ✅ Amadeus flight API integration complete
- ✅ My Trips navigation implemented
- ✅ Flight form UI/UX improvements
- ✅ Real-time flight data lookup working
- ✅ Sandbox deployment stable

### What's Working
- User authentication and trip creation
- Real-time flight lookup (AS, UA airlines in test)
- Trip collaboration with share codes
- Flight management with auto-populate
- My Trips view and navigation
