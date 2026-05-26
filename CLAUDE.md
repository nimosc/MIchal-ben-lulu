# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start development server (localhost:3000)
npm run build    # production build (runs typecheck + lint)
npm run lint     # ESLint (Next.js + TypeScript rules)
```

No test suite. Deployed to Netlify via `@netlify/plugin-nextjs@5.15.9`.

## Deploying to Netlify

```bash
# Always use this exact sequence:
rm -rf .next
NODE_TLS_REJECT_UNAUTHORIZED=0 netlify deploy --prod
```

**Critical rules:**
- Always delete `.next` before deploying — stale cache causes `Cannot find module './NNN.js'` errors.
- Always prefix with `NODE_TLS_REJECT_UNAUTHORIZED=0` — corporate SSL proxy blocks Netlify CLI otherwise.
- Keep `@netlify/plugin-nextjs` pinned to `5.15.9` — upgrading to 5.15.11+ breaks the build with `PageNotFoundError: Cannot find module for page: /api/scrape`.
- Production URL: **https://fantastic-dodol-8b3737.netlify.app**

## Environment

- Windows + corporate SSL inspection — set `NODE_TLS_REJECT_UNAUTHORIZED=0` when any Node.js process hits SSL cert errors (Supabase, Netlify CLI, etc.). Already set in `.env.local`.
- Required env vars: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Do not start the dev server in the background — it creates orphan Node processes. Ask the user to run it in a separate terminal.

## Architecture

**Stack:** Next.js 14 App Router · Zustand (no persistence) · Supabase (cloud DB) · Tailwind + shadcn/ui · dnd-kit · Anthropic SDK

**Language:** Hebrew UI, RTL layout (`dir="rtl"` on `<html>` root, `lang="he"`).

### Data model (`src/types/index.ts`)

- `Project` — top-level container with `floors: Floor[]` and `webhook_url`
- `Floor` — `{ id, name, order, rooms: Room[], items: LightingItem[] }`
- `Room` — `{ id, name, order }` — ordered list per floor
- `LightingItem` — lighting fixture spec with `rooms: ItemRoom[]` (many-to-many with qty), `price_per_unit`, `scraped_status`, and `scraped: ScrapedData`
- `ScrapedData` — product attributes fetched from a URL (name, wattage, CRI, images, variants, etc.)
- `Accessory` — sub-item on a LightingItem, same scraped pattern
- `SavedLightingTemplate` — reusable body spec stored in `itemHistory`

### State (`src/store/useStore.ts`)

Single Zustand store **without** localStorage persistence. Data lives in Supabase.

- On app mount, `StoreProvider` calls `initialize()` which loads from two Supabase tables: `projects` and `app_settings`.
- Every mutating action updates local state synchronously (optimistic) and fires a background `syncProject()` or `syncSettings()` to Supabase — fire-and-forget, errors logged to console.
- `setScrapedStatus` (sets transient "loading"/"error" states) does **not** sync to Supabase.
- `presetRooms` and `itemHistory` are stored together in `app_settings` under key `"global"`.

### Supabase schema

```sql
projects (id uuid pk, name text, webhook_url text, floors jsonb, created_at timestamptz, updated_at timestamptz)
app_settings (key text pk, value jsonb)
```

Both tables have RLS enabled with an `allow_all` policy (anon access, single-user app).

### Routes

| Route | Purpose |
|---|---|
| `/` | Project grid — create / delete projects |
| `/project/[id]` | Floor list — add / remove floors |
| `/project/[id]/setup` | Webhook URL config |
| `/project/[id]/floor/[floorId]/setup` | Manage rooms (drag-to-reorder) |
| `/project/[id]/floor/[floorId]/items` | List and manage lighting items |
| `/project/[id]/floor/[floorId]/item` | Individual item detail / edit |
| `/project/[id]/floor/[floorId]/item/[itemId]/accessory` | Accessory detail |
| `/settings` | Edit global `presetRooms` list |
| `/api/scrape` | POST `{ url }` → extracts structured product data via Claude Haiku |

Legacy routes `/project/[id]/items` and `/project/[id]/item` still exist but are superseded by floor-scoped variants.

### Scrape API (`src/app/api/scrape/route.ts`)

Fetches a product page, strips HTML, sends truncated text to `claude-haiku-4-5-20251001` with a `save_product_data` tool schema, returns structured JSON.

### UI patterns

- Drag-to-reorder uses `@dnd-kit/core` + `@dnd-kit/sortable` — see `SortableRoom` in the floor setup page as reference.
- Inline editing: hover shows pencil icon → click opens borderless `<input>` with amber underline → Enter/✓ commits, Escape/✗ cancels.
- Path alias `@/` maps to `src/`.
- Theming via CSS HSL variables; `tag-amber` is a custom Tailwind utility class.

### Supabase operations

To run SQL against the project (`gfrtqiqmunhkresjxyip`) without the dashboard, use the Management API with the OAuth token from `~/.claude/.credentials.json` (mcpOAuth key `supabase|3ff76dfad93f24cf`). Always set `NODE_TLS_REJECT_UNAUTHORIZED=0` for Node.js requests.
