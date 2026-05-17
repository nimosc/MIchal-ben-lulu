# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start development server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint (Next.js + TypeScript rules)
```

There are no tests. The app is deployed to Netlify via `@netlify/plugin-nextjs`.

Requires `ANTHROPIC_API_KEY` env var for the scrape API route to work.

## Architecture

**Stack:** Next.js 14 App Router · Zustand + localStorage · Tailwind + shadcn/ui · dnd-kit · Anthropic SDK

**Language:** Hebrew UI, RTL layout (`dir="rtl"` on `<html>` root, `lang="he"`).

### Data model (`src/types/index.ts`)

- `Project` — top-level container with `floors: Floor[]` and `webhook_url`
- `Floor` — `{ id, name, order, rooms: Room[], items: LightingItem[] }`
- `Room` — `{ id, name, order }` — ordered list per floor
- `LightingItem` — a lighting fixture spec with `rooms: ItemRoom[]` (many-to-many with qty), `price_per_unit`, `scraped_status`, and `scraped: ScrapedData`
- `ScrapedData` — product attributes fetched from a URL (name, wattage, CRI, images, variants, etc.)

The store has a migration (v1 → v2) that moves legacy top-level `rooms`/`items` on a project into a first floor automatically.

### State (`src/store/useStore.ts`)

Single Zustand store persisted to localStorage as `"lighting-store"`. Also holds `presetRooms: string[]` — the default quick-add room list shared across all projects, configurable from `/settings`.

### Routes

| Route | Purpose |
|---|---|
| `/` | Project grid — create / delete projects |
| `/project/[id]` | Floor list — add / remove floors |
| `/project/[id]/setup` | Webhook URL config for the project |
| `/project/[id]/floor/[floorId]/setup` | Manage rooms for a floor (drag-to-reorder) |
| `/project/[id]/floor/[floorId]/items` | List and manage lighting items for a floor |
| `/project/[id]/floor/[floorId]/item` | Individual item detail / edit |
| `/settings` | Edit the global `presetRooms` preset list |
| `/api/scrape` | POST `{ url }` → fetches page, extracts structured product data via Claude Haiku |

The legacy routes `/project/[id]/items` and `/project/[id]/item` still exist but are superseded by the floor-scoped variants above.

### Scrape API (`src/app/api/scrape/route.ts`)

Fetches a product page, strips HTML, sends truncated text to `claude-haiku-4-5-20251001` with a `save_product_data` tool schema, and returns structured JSON. `NODE_TLS_REJECT_UNAUTHORIZED=0` is set to bypass SSL inspection in dev environments. Debug output is sent to `localhost:7926`.

### UI patterns

- Drag-to-reorder uses `@dnd-kit/core` + `@dnd-kit/sortable` with `useSortable` hooks — see `SortableRoom` in the floor setup page as the reference pattern.
- Inline editing pattern: hover shows pencil icon → click opens borderless `<input>` with amber underline → Enter/✓ commits, Escape/✗ cancels.
- Path alias `@/` maps to `src/`.
- Theming via CSS HSL variables; Tailwind `tag-amber` is a custom utility class.
