# Namahatta Management System

## Overview
This is a full-stack web application designed for managing Namahatta religious/spiritual organizations. Its primary purpose is to provide comprehensive functionality for the management of devotees, Namahattas (spiritual centers), hierarchical leadership structures, and devotional statuses. The system aims to streamline administrative tasks and enhance the organizational capabilities of Namahatta centers.

## User Preferences
Preferred communication style: Simple, everyday language.
Navigation layout: Horizontal top navigation bar instead of left sidebar for desktop interface.

## Recent Changes

### November 2025 - Schema Migration "namhatta" to "namahatta" COMPLETED ✅
- **Codebase Rename**: Renamed all instances of "namhatta" (one 'a') to "namahatta" (two 'a's) throughout TypeScript/JavaScript files
- **Component Files**: Renamed NamahattaForm.tsx, NamahattaUpdateForm.tsx, ChangeNamahattaModal.tsx, NamahattaApprovalCard.tsx
- **Database Schema**: Renamed tables (namahattas, namahatta_updates, namahatta_addresses) and columns (namahatta_id)
- **Neon Pooler Cache Issue**: Resolved using `DISCARD ALL;` SQL command to clear cached prepared statements that were causing "column does not exist" errors after rename
- **Resolution Note**: When renaming database columns with Neon PostgreSQL pooler, always run `DISCARD ALL;` to clear cached prepared statements

### January 2025 - District Supervisor Assignment Implementation COMPLETED ✅
- **Database Schema**: Added mandatory `districtSupervisorId` field to namahattas table with NOT NULL constraint
- **Backend APIs**: Implemented district supervisor lookup (`/api/district-supervisors`) and user address defaults (`/api/user/address-defaults`) endpoints
- **Frontend Integration**: Enhanced NamahattaForm with complete role-based district supervisor selection and validation
- **Role-based Features**: 
  - District Supervisors: Auto-assignment + address pre-filling (country/state/district locked)
  - Admin/Office Users: Manual supervisor selection with district-based filtering
- **Data Migration**: Created migration script (`migrate-district-supervisors.sql`) for existing namahattas
- **Testing & Validation**: Comprehensive frontend testing completed with 12/12 tests passing, covering all business logic, form validation, error handling, and user workflows
- **Production Ready**: Feature fully implemented and tested, ready for deployment

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: React Query (TanStack Query) for server state
- **Styling**: Tailwind CSS with custom design system, glass morphism design
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Build Tool**: Vite
- **UI/UX Decisions**: Responsive app layout, consistent gradient styling, custom scrollbars, minimal and compact layouts for data-heavy pages, modern visual design for cards and sections (e.g., gradient backgrounds, floating animations), automatic scroll-to-top on navigation, dark mode support.

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens with HTTP-only cookies, bcrypt password hashing, PostgreSQL-based sessions with single login enforcement
- **Authorization**: Role-based access control (ADMIN, OFFICE, DISTRICT_SUPERVISOR) with district-based data filtering
- **Security**: Rate limiting, token blacklisting
- **API Design**: RESTful API with JSON responses, compliance with OpenAPI 3.0.3 specification

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon (serverless)
- **ORM**: Drizzle ORM for type-safe database operations and migrations (Drizzle Kit)
- **Session Storage**: PostgreSQL-based session store
- **Connection**: Neon serverless PostgreSQL with connection pooling

### Key System Features
- **Database Schema**: Manages Devotees, Namahattas, Devotional Statuses, Shraddhakutirs, Leaders, normalized Addresses, Users (with roles and sessions), User_Districts, and JWT_Blacklist.
- **Data Entry Forms**: Comprehensive forms with validation for devotees, namahattas, and updates, including streamlined pincode-based address entry.
- **Data Display**: Paginated lists with filtering and search, detailed views with tabbed interfaces, dynamic event status badges.
- **Dashboard**: Summary statistics, recent activity, status distribution.
- **Leadership Hierarchy**: Visual representation of the organizational structure with proper roles.
- **Geographic Information System (GIS)**: Interactive map visualization of Namahatta distribution with zoom-based geographic aggregation (country → state → district → sub-district → village).
- **Updates System**: Comprehensive Namahatta Updates system with rich forms, activity tracking (kirtan, prasadam, book distribution, chanting, arati, bhagwat path), image upload, and dedicated Updates page with filtering and search.
- **Address Management**: Normalized address handling, present and permanent addresses for devotees, and proper address linking for Namahattas.

## External Dependencies

- **React Ecosystem**: React 18, React Query, React Hook Form
- **Backend Framework**: Express.js
- **Runtime**: Node.js
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **UI Libraries**: Radix UI, Tailwind CSS, shadcn/ui, Lucide Icons
- **Authentication**: bcryptjs, jsonwebtoken
- **Build Tools**: Vite, ESBuild
- **Other**: Wouter (router)