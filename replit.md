# IRSON Digital Studio - Fullstack Web Development Platform

## Overview

This is a modern, interactive digital studio platform for @iristonweb (iristonweb.ru). The platform combines a professional portfolio with a full lead management system, admin panel, project estimation calculator, and analytics dashboard. Built as a SPA with focus on performance and user experience, it serves as both a client-facing portfolio and a comprehensive business management tool.

## Recent Changes

**December 30, 2025 (ЭТАП 8-10):**
- Transformed portfolio into digital studio platform with professional branding
- Updated hero section messaging: "Цифровая студия веб-разработки"
- Updated pricing to CIS market rates:
  - Landing: 45,000₽ / Corporate: 120,000₽ / E-commerce: 250,000₽ / SaaS: 500,000₽
  - Features: Auth 35k, Admin 80k, Payment 50k, Profile 60k, Integrations 45k, Multilang 30k
- Added legal disclaimers to all forms (personal data consent, non-public offer)
- Built complete admin panel with session-based authentication
- Implemented automatic lead scoring (A/B/C based on budget, urgency, features)
- Created analytics dashboard with charts (Recharts)
- Added leads management with status updates and filtering
- Portfolio project management (CRUD) in admin panel
- PostgreSQL database with Drizzle ORM for persistent storage

## User Preferences

Preferred communication style: Simple, everyday language (Russian).
Target market: CIS region (Russia, Ukraine, Belarus, Kazakhstan)

## Environment Variables

**Required for full functionality:**
- `ADMIN_PASSWORD` - Admin panel login password (REQUIRED, no default for security)
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather for notifications
- `TELEGRAM_CHAT_ID` - Chat ID to receive lead notifications
- `DATABASE_URL` - PostgreSQL connection string (auto-configured on Replit)
- `SESSION_SECRET` - Session encryption key

**Note:** Contact form and estimation work without Telegram tokens but won't send notifications.

## System Architecture

### Frontend Architecture

**Framework & Language**
- **Vite + React 18** with TypeScript
- **Wouter** for lightweight client-side routing
- **SPA design** with smooth scroll navigation between sections

**UI & Styling**
- **Tailwind CSS** with custom design tokens
- **shadcn/ui** component library (New York variant)
- **Framer Motion** for animations
- **Recharts** for analytics visualizations
- **Theme System**: Dark mode default with light mode toggle

**Key Interactive Features**
- **Project Estimation Calculator**: 4-step wizard with real-time pricing
- **Interactive Skill Graph**: Node-based visualization
- **Animated Robot Illustration**: Reacts to form field focus
- **Typewriter Effect**: Rotating developer roles in hero

**State Management**
- **TanStack Query v5** for server state and caching
- **React Hook Form** with Zod validation
- **React Context** for theme state

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript
- Session-based admin authentication (express-session + memorystore)
- Development: Vite middleware for HMR
- Production: Static build from `dist/public`

**API Endpoints**
```
Public:
POST /api/contact     - Submit contact form (saves lead + Telegram notification)
POST /api/estimate    - Submit estimation request (saves lead with scoring)

Admin (requires auth):
POST   /api/admin/login   - Admin login
POST   /api/admin/logout  - Admin logout  
GET    /api/admin/me      - Check auth status
GET    /api/leads         - List all leads
GET    /api/leads/:id     - Get lead details
PATCH  /api/leads/:id     - Update lead (status, notes)
DELETE /api/leads/:id     - Delete lead
GET    /api/leads/stats   - Dashboard statistics
GET    /api/projects      - List portfolio projects
POST   /api/projects      - Create project
PATCH  /api/projects/:id  - Update project
DELETE /api/projects/:id  - Delete project
```

**Lead Scoring Algorithm**
Points-based scoring (7+ = A, 4-6 = B, <4 = C):
- Budget: 200k+ = 3pts, 100-200k = 2pts, 50-100k = 1pt
- Project Type: SaaS/webapp = 2pts, ecommerce = 1.5pts
- Urgency: urgent = 2pts, standard = 1pt
- Features count: 4+ = 2pts, 2-3 = 1pt
- Description length: 200+ chars = 1pt

**Data Layer**
- **PostgreSQL** with Drizzle ORM
- **Schema**: leads (with scoring, estimation data), projects, users
- Automatic timestamps (createdAt, updatedAt)

### Admin Panel Routes

```
/admin/login      - Login page
/admin            - Dashboard (stats, recent leads, charts)
/admin/leads      - Lead management (list, filter, update status)
/admin/analytics  - Analytics dashboard with charts
/admin/projects   - Portfolio project management (CRUD)
```

### Build System

**Development**
- `npm run dev` - tsx for TypeScript execution + Vite HMR

**Production Build**
- esbuild bundles server to `dist/index.cjs`
- Vite builds client to `dist/public`

**Path Aliases**
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

### Pricing Configuration

Pricing defined in `client/src/data/estimation-config.ts`:

**Base Project Types:**
- Landing: 45,000₽ (7 days)
- Corporate Site: 120,000₽ (21 days)
- E-commerce: 250,000₽ (45 days)
- SaaS Platform: 500,000₽ (90 days)
- Web App: 350,000₽ (60 days)
- Telegram Bot: 60,000₽ (14 days)

**Additional Features:**
- Auth/Registration: 35,000₽ (5 days)
- Admin Panel: 80,000₽ (14 days)
- Online Payment: 50,000₽ (7 days)
- User Profile: 60,000₽ (10 days)
- API Integrations: 45,000₽ (7 days)
- Multilanguage: 30,000₽ (5 days)

**Coefficients:**
- Design: Basic (1.0x), Modern (1.4x), Premium+UX (1.8x)
- Urgency: Relaxed (0.95x, 1.3x time), Standard (1.0x), Urgent (1.6x, 0.6x time)

**Estimate Formula:** (BasePrice + ΣFeatures) × DesignCoef × UrgencyCoef ± 20%

## Key Files

**Schema & Types:**
- `shared/schema.ts` - Database schemas, Zod validation, TypeScript types

**Backend:**
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database operations
- `server/scoring.ts` - Lead scoring algorithm

**Frontend:**
- `client/src/data/estimation-config.ts` - Pricing configuration
- `client/src/data/projects.ts` - Portfolio project data
- `client/src/components/sections/estimation-section.tsx` - Calculator wizard
- `client/src/pages/admin/*.tsx` - Admin panel pages
- `client/src/components/admin-layout.tsx` - Admin panel layout

## External Dependencies

### Core
- **Express** + **express-session** + **memorystore** - Server & auth
- **Drizzle ORM** + **pg** - PostgreSQL database
- **TanStack Query v5** - Data fetching & caching
- **Zod** - Schema validation

### UI
- **@radix-ui/*** - Accessible UI primitives
- **shadcn/ui** - Pre-built components
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Recharts** - Charts for analytics
- **Lucide React** + **React Icons** - Icons

### Forms
- **React Hook Form** - Form state
- **@hookform/resolvers** - Zod integration
- **drizzle-zod** - Generate Zod from Drizzle
