# Namahatta Management System - Replit Import Guide

## Quick Import Instructions

This guide ensures smooth and fast imports of the Namahatta Management System into any Replit account without requiring additional configuration.

## Pre-configured Settings

The application has been configured with the following defaults to ensure immediate functionality:

### 1. Database Configuration
- **Default Database**: Neon PostgreSQL (pre-configured)
- **Connection String**: Built-in with SSL requirements
- **Schema**: Auto-migrates on startup

### 2. Authentication System
- **JWT Tokens**: Pre-configured with secure secrets
- **Session Management**: PostgreSQL-backed sessions
- **Demo Users**: Available after initial setup (contact administrator for credentials)

### 3. Environment Variables
All necessary environment variables are configured automatically during setup. The application includes secure defaults for development and production environments.

## Import Steps

### Step 1: Import to Replit
1. Import the project into your Replit account
2. No additional configuration required

### Step 2: Run the Application
1. The application will start automatically using the configured workflow
2. Server runs on port 5000 with both frontend and backend
3. Database connection is automatic

### Step 3: Access the Application
1. Open the application URL in your browser
2. Login with provided demo credentials (contact administrator)
3. All features are immediately available

## What's Included

### Core Features
- ✅ Devotee Management System
- ✅ Namahatta (Center) Management
- ✅ Hierarchical Leadership Structure
- ✅ Devotional Status Tracking
- ✅ Address Management with Geographic Data
- ✅ Authentication & Authorization
- ✅ Interactive Dashboard
- ✅ Map Visualization
- ✅ Updates & Events System

### Technical Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Authentication**: JWT + bcrypt + sessions
- **UI Library**: Radix UI + shadcn/ui

### Pre-loaded Data
- 250+ Devotees with complete profiles
- 100+ Namahattas across India
- Geographic data for all Indian states/districts
- Hierarchical leadership structure
- Demo users with different roles

## No Additional Setup Required

The following are already configured and working:
- Database schema and migrations
- Authentication system
- Environment variables
- Package dependencies
- Build and dev scripts
- Port configuration for Replit
- SSL database connections
- CORS and security headers
- Rate limiting
- Session management

## Troubleshooting

If you encounter any issues:

1. **Database Connection**: The connection string is pre-configured and should work immediately
2. **Authentication**: Demo users are already created in the database
3. **Dependencies**: All packages are listed in package.json and will install automatically
4. **Port Access**: Application runs on port 5000 (Replit's default)

## File Structure
```
├── client/                 # React frontend
├── server/                 # Express backend
├── shared/                 # Shared TypeScript schemas
├── migrations/             # Database migrations
├── .env.local             # Pre-configured environment
├── package.json           # Dependencies
└── replit.md             # Project documentation
```

## Development Workflow

1. **Development**: `npm run dev` (auto-starts)
2. **Build**: `npm run build`
3. **Production**: `npm run start`
4. **Database**: `npm run db:push`

## Security Notes

- Database credentials are for a development database
- JWT secrets are development keys
- For production deployment, regenerate all secrets
- Authentication is enabled by default

## Migration History

This project has been successfully migrated from Replit Agent to standard Replit environment with:
- Complete database integration
- Working authentication system
- All dependencies resolved
- Environment properly configured
- No manual setup required

Last Updated: July 24, 2025