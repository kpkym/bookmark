# Bookmark Manager

Self-hosted bookmark manager with screenshot capture via Chrome extension.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- **Database:** SQLite via Drizzle ORM + better-sqlite3
- **Package manager:** bun
- **Deployment:** Docker (standalone output)

## Commands

- `bun dev` — Start dev server (http://localhost:3136)
- `bun run build` — Production build
- `bun lint` — ESLint
- `bunx drizzle-kit generate` — Generate migration from schema changes
- `bunx drizzle-kit migrate` — Apply migrations
- `docker compose up --build` — Build and run in Docker

## Project Structure

```text
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main page (client component)
│   └── api/
│       ├── bookmarks/          # GET (list/search), POST (create with FormData)
│       │   └── [id]/           # PATCH, DELETE
│       ├── folders/            # GET (list all), POST (create)
│       │   └── [id]/           # PATCH, DELETE
│       ├── screenshots/[filename]/ # GET (serve screenshot files)
│       └── [...path]/          # OPTIONS (CORS preflight catch-all)
├── components/
│   ├── bookmark-card.tsx       # Single bookmark card with delete menu
│   ├── bookmark-grid.tsx       # Grid of bookmark cards with fetch logic
│   ├── folder-tree.tsx         # Recursive folder tree navigation
│   ├── search-bar.tsx          # Search input
│   └── sidebar.tsx             # Sidebar with folder tree + create folder
├── db/
│   ├── schema.ts               # Drizzle schema (folders, bookmarks tables)
│   └── index.ts                # DB connection (DELETE mode, foreign keys ON)
└── lib/
    └── screenshots.ts          # Screenshot save/delete/path utilities
extension/                      # Chrome Extension (Manifest V3)
data/                           # Runtime data (gitignored)
├── bookmarks.db                # SQLite database
└── screenshots/                # Uploaded screenshot files
drizzle/                        # Generated migrations
```

## Architecture Notes

- **No auth** — single-user, network-protected deployment
- **Screenshots** stored on local filesystem at `data/screenshots/`, served via API route
- **Bookmarks API** accepts `FormData` (not JSON) to support file upload in POST
- **Chrome extension** captures visible tab screenshot and POSTs to configurable server URL
- **CORS** enabled on all API routes for chrome-extension:// origin
- **Self-referencing foreign key** in folders table requires `any` type cast (Drizzle limitation)
- **Database** at `data/bookmarks.db` with DELETE journal mode

## Conventions

- Semantic commit messages: `feat:`, `fix:`, `chore:`
- API routes use Next.js 15+ async params pattern: `{ params }: { params: Promise<{ id: string }> }`
- All components in `src/components/` are client components (`"use client"`)
