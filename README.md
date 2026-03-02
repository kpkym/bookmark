# Bookmark Manager

A self-hosted bookmark manager with screenshot capture via a Chrome extension.

## Features

- Save bookmarks with title, URL, and description
- Capture and store page screenshots via Chrome extension
- Organize bookmarks into nested folders
- Search bookmarks by title or URL
- Batch delete and move bookmarks across folders
- Docker-ready for self-hosted deployment

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- **Database:** SQLite via Drizzle ORM + better-sqlite3
- **Package manager:** Bun
- **Deployment:** Docker (standalone output)

## Getting Started

### Development

```bash
bun install
bun run dev
```

Open [http://localhost:3136](http://localhost:3136) in your browser.

### Production (Docker)

```bash
docker compose up --build
```

The app will be available at [http://localhost:3136](http://localhost:3136). Data is persisted in the `./data` volume.

## Chrome Extension

The `extension/` directory contains a Manifest V3 Chrome extension that captures a screenshot of the current tab and saves it to your bookmark server.

**Setup:**

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder
4. Click the extension icon, set your server URL (e.g. `http://localhost:3136`), and save bookmarks with one click

## Database Migrations

```bash
# Generate migration from schema changes
bunx drizzle-kit generate

# Apply migrations
bunx drizzle-kit migrate
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       ├── bookmarks/          # GET, POST
│       │   └── [id]/           # PATCH, DELETE
│       ├── folders/            # GET, POST
│       │   └── [id]/           # PATCH, DELETE
│       ├── screenshots/[filename]/
│       └── [...path]/          # CORS preflight
├── components/
│   ├── bookmark-card.tsx
│   ├── bookmark-grid.tsx
│   ├── batch-toolbar.tsx
│   ├── folder-tree.tsx
│   ├── search-bar.tsx
│   └── sidebar.tsx
├── db/
│   ├── schema.ts
│   └── index.ts
└── lib/
    └── screenshots.ts
extension/                      # Chrome Extension (Manifest V3)
data/                           # Runtime data (gitignored)
├── bookmarks.db
└── screenshots/
drizzle/                        # Generated migrations
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookmarks` | List/search bookmarks |
| POST | `/api/bookmarks` | Create bookmark (FormData with optional screenshot) |
| PATCH | `/api/bookmarks/:id` | Update bookmark |
| DELETE | `/api/bookmarks/:id` | Delete bookmark |
| GET | `/api/folders` | List all folders |
| POST | `/api/folders` | Create folder |
| PATCH | `/api/folders/:id` | Rename folder |
| DELETE | `/api/folders/:id` | Delete folder |
| GET | `/api/screenshots/:filename` | Serve screenshot file |
