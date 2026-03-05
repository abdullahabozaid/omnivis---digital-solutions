# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Start dev server (Vite)
npm run build  # Build for production
npm run preview # Preview production build
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_GEMINI_API_KEY` - Optional, for AI features

The app works without Supabase configured (falls back to local storage).

## Architecture

Tawfeeq is an internal business dashboard for managing clients, CRM pipelines, tasks, and website templates. Built with React 19 + TypeScript + Vite.

### Data Flow

```
Components → Hooks → Services → Supabase/Offline Queue
                ↓
            Context Providers (Auth, Sync)
```

### Key Directories

- `services/` - Data layer with BaseService class providing CRUD + offline sync + realtime subscriptions
- `hooks/` - React hooks wrapping services (useClients, usePipelines, useTasks, etc.)
- `context/` - SupabaseContext (auth, settings, goals), SyncContext (offline sync state)
- `lib/supabase/` - Supabase client and TypeScript types
- `utils/` - offline-queue.ts (IndexedDB operations queue), migration.ts, storage.ts

### Service Layer Pattern

All data services extend `BaseService<T>` which provides:
- CRUD operations with automatic offline queueing
- IndexedDB caching for offline access
- Realtime subscriptions via Supabase
- Sync with conflict resolution

### Offline-First Architecture

Operations when offline are queued in IndexedDB (`tawfeeq-offline` database) and synced when online. The `useOfflineSync` hook manages sync state and triggers.

### Provider Hierarchy (App.tsx)

```
AppErrorBoundary → ThemeProvider → SupabaseProvider → SyncProvider → ToastProvider → KeyboardShortcutsProvider
```

### Views

Routing via `currentView` state in App.tsx: `overview`, `clients`, `crm`, `templates`, `clientwork`, `calendar`, `tasks`, `settings`, `analytics`, `websites`

### Styling

- Tailwind CSS via CDN with custom `gold-*` color palette and `dark-*` tokens
- Dark mode via `class` strategy
- Inter font family
- Design tokens: `rounded-xl`, `border-gray-200`, `bg-white` cards
- All currency in GBP (£)

### Key Patterns

- Command palette: Cmd+K / Ctrl+K
- Keyboard shortcuts managed via KeyboardShortcutsProvider
- Error boundaries wrap both app and individual views
- Migration wizard for Supabase data migration on first run
