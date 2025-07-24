# Volleyball League Management System

## Overview

This is a full-stack web application designed to scrape, store, and manage volleyball league data from German volleyball associations. The system provides both admin capabilities for data management and player-facing features for registration and team participation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for development and bundling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Session Management**: express-session for admin authentication
- **File Processing**: Canvas for PDF rendering, Cheerio for web scraping
- **Video Generation**: Custom video generator for match highlights

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (via Neon serverless)
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Neon serverless with WebSocket support

## Key Components

### Data Scraping System
- **Web Scraper**: Automated volleyball league data extraction from official websites
- **PDF Parser**: Extracts match details, lineups, and scores from official scoresheets
- **Contact Extraction**: Gathers team contact information for communication
- **Error Handling**: Robust error recovery and logging for scraping operations

### Authentication & Authorization
- **Admin System**: Session-based authentication for administrative users
- **Player Accounts**: Registration and verification system for players
- **SAMS Integration**: Validates player identities against official volleyball database
- **Role-based Access**: Different permission levels for admins and players

### Data Management
- **League Management**: Create, update, and organize volleyball leagues
- **Team Management**: Store team information, contact details, and rosters
- **Player Management**: Track player profiles, positions, and team associations
- **Match Management**: Store game results, sets, lineups, and statistics

### Advanced Features
- **Video Generation**: Creates match highlight videos from scoresheet data
- **Training Sessions**: Manage team training schedules and attendance
- **Summer Leagues**: Special league system for recreational tournaments
- **Team Highlights**: Automatic detection and tracking of team achievements

## Data Flow

1. **Data Ingestion**: Web scraper extracts league and match data from volleyball association websites
2. **PDF Processing**: Match scoresheets are parsed to extract detailed game statistics
3. **Data Storage**: All information is stored in PostgreSQL using Drizzle ORM
4. **API Layer**: Express.js provides RESTful endpoints for frontend consumption
5. **Client Interface**: React frontend displays data with real-time updates via TanStack Query

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Volleyball Association APIs**: Official German volleyball league websites
- **SAMS Database**: Official player verification system

### Third-party Libraries
- **Canvas**: PDF rendering and image generation
- **Cheerio**: HTML parsing for web scraping
- **Axios**: HTTP client for external API calls
- **BCrypt**: Password hashing for security
- **FFmpeg**: Video processing capabilities

### UI Components
- **Radix UI**: Accessible component primitives
- **Lucide Icons**: Consistent iconography
- **React Hook Form**: Form validation and management

## Deployment Strategy

### Development
- **Local Development**: Vite dev server with hot reload
- **Database**: Neon development instance
- **Environment**: NODE_ENV=development with debug logging

### Production
- **Build Process**: Vite builds frontend, esbuild bundles backend
- **Server**: Single Node.js process serving both API and static files
- **Database**: Neon production instance with connection pooling
- **Session Storage**: In-memory sessions (suitable for single-instance deployment)

### Configuration
- **Environment Variables**: DATABASE_URL, SESSION_SECRET
- **TypeScript**: Strict mode with path aliases for clean imports
- **ESM**: Full ES module support throughout the stack

The system is designed as a monorepo with clear separation between client and server code, shared TypeScript types, and a robust data pipeline for volleyball league management.