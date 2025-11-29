# Namahatta Management System

A comprehensive web application for managing Namahatta religious/spiritual organizations, built with React and Express.js.

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd namahatta-management-system
   npm install
   ```

2. **Database Setup**
   The project is pre-configured with a specific Neon PostgreSQL database. The `.env` file contains the database URL:
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_5MIwCD4YhSdP@ep-calm-silence-a15zko7l-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

3. **Initialize Database Schema**
   ```bash
   npm run db:push
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   Application will be available at `http://localhost:5000`

## Database Configuration

The application uses a specific Neon PostgreSQL database by default. This configuration ensures:
- Consistent database access across different environments
- No need for users to set up their own database
- Automatic connection when importing the project

If you need to use a different database, update the `DATABASE_URL` in the `.env` file.

## Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Build Tool**: Vite for frontend, ESBuild for backend

## Key Features

- Devotee management with comprehensive profiles
- Namahatta (spiritual center) administration
- Leadership hierarchy tracking
- Geographic organization by regions
- Real-time updates and notifications
- Responsive mobile-friendly interface

For detailed documentation, see `replit.md`.