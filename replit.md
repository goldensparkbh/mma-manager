# Sports Club Management & Store System

## Overview

A client-only sports club management application with RTL (Arabic) interface. The system handles member management, attendance tracking, subscription management, product store with shopping cart, sales tracking, financial reporting, and activity logs. Built with a React frontend backed by Firebase (Auth, Firestore, Storage).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for data caching and synchronization
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite for development and production builds

**Key Design Decisions**:
- RTL-first design with Arabic (Cairo font) as primary language
- Material Design-inspired layout with dark sidebar navigation
- Component aliases configured via TypeScript paths (`@/components`, `@/lib`, etc.)
- Responsive design with mobile breakpoint at 768px

### Data & Auth (Firebase)
- **Authentication**: Firebase Auth (email/password + phone)
- **Database**: Firestore collections for members, products, attendance, subscriptions, sales, expenses, activity logs, and user roles
- **Storage**: Firebase Storage for member/product images

**Key Design Decisions**:
- Client-only data access (no Express backend)
- Role-based authorization (admin vs staff) via `users/{uid}` documents in Firestore
- Activity logging for critical actions (sales, cancellations, inventory, attendance, expenses)

### Project Structure
```
+-- client/           # React frontend
¦   +-- src/
¦       +-- components/   # UI components (Shadcn + custom)
¦       +-- pages/        # Route pages
¦       +-- hooks/        # Custom React hooks
¦       +-- lib/          # Firebase + utilities
+-- shared/           # Shared types
+-- script/           # One-time migration tooling
```

## External Dependencies

### Firebase
- **Firebase Auth**: Email/password and phone sign-in
- **Firestore**: Primary database for app data
- **Storage**: Member/product image hosting

### Frontend Libraries
- **@tanstack/react-query**: Server state management
- **Radix UI**: Accessible UI primitives (dialog, select, tabs, etc.)
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation
- **wouter**: Lightweight routing

### Build & Development
- **Vite**: Frontend build tool with HMR
- **tsx**: TypeScript execution for scripts (e.g., migration)
