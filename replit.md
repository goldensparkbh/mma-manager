# Sports Club Management & Store System

## Overview

A full-stack sports club management application with RTL (Arabic) interface. The system handles member management, attendance tracking, subscription management, product store with shopping cart, sales tracking, and financial reporting. Built with React frontend and Express backend using PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state caching and synchronization
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite for development and production builds

**Key Design Decisions**:
- RTL-first design with Arabic (Cairo font) as primary language
- Material Design-inspired layout with dark sidebar navigation
- Component aliases configured via TypeScript paths (`@/components`, `@/lib`, etc.)
- Responsive design with mobile breakpoint at 768px

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Session Management**: connect-pg-simple for PostgreSQL session storage

**Key Design Decisions**:
- Unified server serving both API and static frontend assets
- Development uses Vite middleware for HMR; production serves pre-built static files
- Schema-first approach with Drizzle for type-safe database operations
- Zod schemas auto-generated from Drizzle for runtime validation

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend
- **Migrations**: Drizzle Kit with `db:push` command for schema sync

**Core Entities**:
- Users (authentication)
- Members (club membership)
- Products (store inventory)
- Attendance (check-in/check-out records)
- Subscriptions (membership plans)
- Sales (transaction records)
- Expenses (financial tracking)

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # UI components (Shadcn + custom)
│   │   ├── pages/        # Route pages
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database operations interface
│   └── db.ts         # Database connection
├── shared/           # Shared code (schemas, types)
└── migrations/       # Database migrations
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database (connection via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and migrations

### Frontend Libraries
- **@tanstack/react-query**: Server state management
- **Radix UI**: Accessible UI primitives (dialog, select, tabs, etc.)
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation
- **wouter**: Lightweight routing

### Backend Libraries
- **express**: HTTP server framework
- **connect-pg-simple**: PostgreSQL session store
- **drizzle-zod**: Schema validation generation

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development