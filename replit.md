# Developer Portfolio - Interactive Fullstack Portfolio

## Overview

This is a modern, interactive developer portfolio website built as a single-page application (SPA) for @alliniriston. The site showcases technical expertise through the portfolio itself, featuring smooth animations, an interactive terminal, skill visualization, and a contact form with Telegram integration. Built with a focus on performance and user experience, it demonstrates fullstack capabilities while serving as a professional portfolio.

## Recent Changes

**December 30, 2025:**
- Integrated Telegram Bot API for contact form - messages sent directly to @alliniriston
- Removed all GitHub and LinkedIn references - only Telegram as social contact
- Extracted project data to `client/src/data/projects.ts` for scalability
- Updated SEO metadata with canonical URL, Open Graph tags, and proper author info
- Removed `githubUrl` field from Project schema

## User Preferences

Preferred communication style: Simple, everyday language.

## Environment Variables

Required for contact form functionality:
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `TELEGRAM_CHAT_ID` - Chat ID to receive messages

If these are not set, the contact form will still save messages locally but won't send to Telegram.

## System Architecture

### Frontend Architecture

**Framework & Language**
- **Vite + React 18** with TypeScript for type-safe component development
- **Wouter** for lightweight client-side routing (SPA with sections)
- **Single Page Application** design with smooth scroll navigation between sections (Hero, About, Projects, Contact)

**UI & Styling**
- **Tailwind CSS** for utility-first styling with custom design tokens
- **shadcn/ui** component library (New York variant) with Radix UI primitives for accessible, composable components
- **Framer Motion** for declarative animations and transitions
- **Custom cursor** component for enhanced interactivity
- **Theme System**: Dark mode by default with light mode toggle using React Context
- **Typography**: Inter for body text, JetBrains Mono for code/terminal elements

**Key Interactive Features**
- **Animated Background**: Geometric shapes with motion animations
- **Typewriter Effect**: Rotating developer roles in hero section
- **Interactive Skill Graph**: Node-based visualization with hover states showing experience and related technologies
- **Project Modal System**: Expandable cards with detailed project information
- **Animated Robot Illustration**: SVG that reacts to form field focus
- **Terminal-style Navigation**: Visual design elements mimicking developer tools

**State Management**
- **TanStack Query v5** for server state management, caching, and API synchronization
- **React Hook Form** with Zod validation for type-safe form handling
- **React Context** for theme state (dark/light mode)

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript running on Node.js
- **HTTP Server** created with Node's `http` module for potential WebSocket support
- Development mode uses **Vite middleware** for HMR (Hot Module Replacement)
- Production mode serves static build from `dist/public`

**API Design**
- RESTful API endpoints under `/api` prefix
- **Contact Form API**: 
  - `POST /api/contact` - Submit contact messages with Zod validation, sends to Telegram
  - `GET /api/contact` - Retrieve contact messages
- **Telegram Integration**: Server-side notification to @alliniriston via Bot API
- Request/response logging middleware with timing information
- Error handling with validation error formatting using `zod-validation-error`

**Data Layer**
- **Storage Interface Pattern**: `IStorage` interface allows switching between implementations
- **In-Memory Storage**: Default `MemStorage` implementation for development
- **Drizzle ORM**: Configured for PostgreSQL (schema defined, ready for database connection)
- **Schema Design**:
  - `users` table with username/password (prepared for authentication)
  - `contact_messages` table with name, email, message, and timestamps
  - Type-safe schema definitions with Drizzle-Zod integration

### Build System

**Development**
- **tsx** for running TypeScript server code directly
- **Vite Dev Server** with middleware mode for client development
- Hot Module Replacement for instant feedback
- Custom error overlay via Replit plugins

**Production Build**
- **esbuild** bundles server code to single `dist/index.cjs` file
- **Vite** builds client to `dist/public` with optimized assets
- Selective bundling of dependencies (allowlist for critical packages)
- External dependencies reduce bundle size and improve cold start times

**Path Aliases**
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

### Design System

**Color Palette**
- Primary accent: Blue (#3B82F6) or Purple (#8B5CF6) with gradients
- HSL-based color tokens with CSS variables for theme switching
- Elevation system with opacity-based shadows
- Border system with outline variables for cards and buttons

**Component Patterns**
- Composition pattern with Radix UI primitives
- Variant-based styling using `class-variance-authority`
- Consistent spacing units (4, 8, 16, 24, 32px)
- Responsive design with mobile-first approach

**Animation Strategy**
- Framer Motion for page transitions and scroll animations
- Staggered animations for project cards
- Spring physics for custom cursor movement
- Reduced motion preferences respected

## External Dependencies

### UI & Styling
- **@radix-ui/** - Comprehensive set of accessible UI primitives (accordion, dialog, dropdown, popover, etc.)
- **shadcn/ui** - Pre-built components built on Radix UI
- **Tailwind CSS** with PostCSS and Autoprefixer for styles
- **Framer Motion** - Animation library
- **Lucide React** & **React Icons** - Icon libraries (including SiTelegram, tech stack icons)
- **cmdk** - Command menu component
- **embla-carousel-react** - Carousel component
- **class-variance-authority** & **clsx** - Utility for conditional CSS classes

### Forms & Validation
- **React Hook Form** - Form state management
- **@hookform/resolvers** - Validation resolvers
- **Zod** - Schema validation
- **zod-validation-error** - User-friendly validation errors
- **Drizzle-Zod** - Generate Zod schemas from Drizzle tables

### Data & API
- **TanStack Query** (React Query v5) - Server state management
- **Drizzle ORM** - Type-safe database toolkit
- **PostgreSQL** (via `pg`) - Relational database (configured but not required)
- **connect-pg-simple** - PostgreSQL session store (prepared for authentication)

### Server
- **Express** - Web framework
- **Wouter** - Client-side router (Express handles only API routes)
- **date-fns** - Date utilities

### Development Tools
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **esbuild** - Fast JavaScript bundler for server code
- **tsx** - TypeScript execution
- **@replit/vite-plugin-*** - Replit-specific development plugins

### Fonts
- **Google Fonts** - Inter (body), JetBrains Mono (code/terminal)