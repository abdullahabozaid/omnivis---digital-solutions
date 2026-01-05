# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Start dev server on http://localhost:3000
npm run build  # Build for production
npm run preview # Preview production build
```

## Architecture

Tawfeeq is an internal business dashboard for managing clients, CRM pipelines, and website templates. It's a React 19 + TypeScript app using Vite and Tailwind CSS (via CDN).

### Key Files

- `App.tsx` - Main app component with view routing (`overview`, `clients`, `crm`, `templates`)
- `types.ts` - TypeScript interfaces for Client, CrmContact, Pipeline, PipelineStage, WebsiteTemplate
- `index.html` - Entry point with Tailwind config (custom gold color palette) and importmap

### Components

- `Sidebar.tsx` - Collapsible navigation (default collapsed)
- `Header.tsx` - Top bar with search and user profile
- `DashboardOverview.tsx` - Stats cards, pipeline preview, recent clients
- `ModuleViews.tsx` - Contains ClientsView, CrmView, and TemplatesView

### State Management

All state is local React state (useState). No external state management library.

- ClientsView: Local client list with CRUD operations via modals
- CrmView: Multi-pipeline support with drag-and-drop contacts between stages, customizable stages

### Styling

- Tailwind CSS loaded via CDN with custom gold color palette (gold-50 through gold-900)
- Inter font family
- Consistent design tokens: `rounded-xl` borders, `border-gray-200` borders, `bg-white` cards
- All currency displayed in GBP (£)
