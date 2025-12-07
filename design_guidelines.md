# Design Guidelines: Interactive Developer Portfolio

## Design Approach
**Reference-Based**: Drawing inspiration from modern developer portfolios (Linear, GitHub, Stripe) with custom interactive elements that showcase technical expertise through the site itself.

## Core Design Principles
- Minimalist yet highly interactive
- Dark theme primary with light theme option
- Performance-first: smooth animations without sacrificing speed
- Technical showcase: the site IS the portfolio demonstration

## Typography
- **Primary Font**: Inter or Geist Sans for clean, professional readability
- **Monospace Font**: JetBrains Mono or Fira Code for code/terminal elements
- **Hierarchy**: 
  - Hero headline: text-5xl to text-7xl, font-bold
  - Section headings: text-3xl to text-4xl, font-semibold
  - Body: text-base to text-lg
  - Terminal/code: text-sm monospace

## Layout System
- **Spacing Units**: Consistent use of 4, 8, 16, 24, 32 (p-4, p-8, p-16, etc.)
- **Container**: max-w-7xl centered for content sections
- **Section Padding**: py-20 to py-32 for desktop, py-12 to py-16 for mobile

## Color Palette
- **Accent**: Blue (#3B82F6) or Purple (#8B5CF6) - use in gradients, highlights, interactive states
- **Background**: Deep dark with subtle gradient overlays or barely-visible grid patterns
- **Text**: High contrast white/off-white for dark theme

## Sections & Components

### Hero Section (100vh)
- **Layout**: Centered content with animated background
- **Typography Hierarchy**: Large bold name, typewriter effect for rotating roles ("Developer", "Creator", "Problem Solver")
- **Interactive Terminal**: Retro terminal aesthetic (`contentEditable` div), accepts commands (help, projects, contact)
- **Background**: Animated geometric shapes or particles system
- **CTAs**: Two prominent buttons - "View Projects" and "Contact"

### About Section
- **Visual Focus**: Interactive skill graph/map - not traditional text blocks
- **Skill Nodes**: Icon-based tech bubbles (Next.js, React, Node.js, databases)
- **Interactivity**: Hover reveals experience descriptions, connected technologies show relationship lines
- **Layout**: Graph visualization on one side, brief philosophy text on other (2-column on desktop)

### Projects Section
- **Grid Layout**: 2-3 columns on desktop, 1 column mobile (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- **Card Design**: 
  - Project screenshot/preview image
  - Overlay on hover showing tech stack tags
  - Clean card borders with subtle shadows
- **Modal Expansion**: Click expands in-page (not new tab) with larger images, detailed description, problem/solution narrative
- **Animation**: Staggered card appearance on scroll

### Contact Section
- **Form Layout**: Clean, spacious form on left, interactive SVG illustration on right (2-column)
- **Form Design**: Real-time validation states, focused field highlights
- **Social Links**: Radial menu pattern with animated icons (GitHub, Telegram, LinkedIn)
- **SVG Character**: Playful robot/spaceship that reacts to form field focus

## Navigation
- **Fixed Header**: Translucent backdrop-blur on scroll
- **Links**: Smooth anchor scrolling to sections
- **Theme Toggle**: Prominent sun/moon icon toggle

## Interactive Elements

### Custom Cursor
- Replace default with thin circular cursor
- Grows/changes color on hover over interactive elements
- Smooth follow animation

### Background Effects
- Subtle particle movement or floating geometric shapes
- Cursor-reactive (slight movement response)
- Low opacity to avoid distraction

### Animations (Framer Motion)
- Hero text: Typewriter effect with cursor blink
- Cards: Staggered fade-in-up on scroll
- Skill graph: Pulse animations on hover
- Modals: Scale-up from card position
- Keep animations smooth (60fps target)

## Images
**Large Hero Image**: No - use animated background effects instead
**Project Screenshots**: Yes - showcase actual project interfaces
**About Section**: Optional icon/avatar, focus on skill graph visualization
**Contact SVG**: Yes - interactive character illustration

## Accessibility
- Keyboard navigation for all interactive elements
- Focus states clearly visible
- Sufficient color contrast ratios
- Semantic HTML structure
- ARIA labels for icon buttons

## Responsive Behavior
- Mobile: Single column stacking, simplified animations
- Tablet: 2-column grids where appropriate
- Desktop: Full multi-column layouts with all interactive features
- Touch devices: Hover states become tap/active states