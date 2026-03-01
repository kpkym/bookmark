# Bookmark Manager with Screenshots — Design

## Goal

A lightweight, self-hosted bookmark manager that captures screenshots via a Chrome extension. Designed as a simpler alternative to Linkwarden for single-user homelab use.

## Architecture

Single Next.js 15 app (App Router) with:

- **API Routes** — CRUD for bookmarks and folders, screenshot upload
- **Server Components** — web UI (bookmark grid, search, folder tree)
- **SQLite** via Drizzle ORM — `./data/bookmarks.db`
- **Local filesystem** — screenshots at `./data/screenshots/{id}.webp`
- **Chrome Extension** — captures visible tab screenshot + metadata, POSTs to API
- **No auth** — protected at network level

## Tech Stack

- Next.js 15 (App Router)
- Drizzle ORM + better-sqlite3
- TypeScript
- Chrome Extension (Manifest V3)
- Docker for deployment

## Data Model

### folders

| Column     | Type      | Notes                              |
|------------|-----------|------------------------------------|
| id         | integer   | PK, autoincrement                  |
| name       | text      | required                           |
| parent_id  | integer   | FK → folders.id, nullable (root)   |
| created_at | timestamp | default now                        |

### bookmarks

| Column          | Type      | Notes                              |
|-----------------|-----------|------------------------------------|
| id              | integer   | PK, autoincrement                  |
| url             | text      | unique                             |
| title           | text      | required                           |
| description     | text      | nullable                           |
| screenshot_path | text      | nullable                           |
| folder_id       | integer   | FK → folders.id, nullable (root)   |
| created_at      | timestamp | default now                        |
| updated_at      | timestamp | default now, update on change      |

## API Endpoints

| Method | Path                 | Description                                      |
|--------|----------------------|--------------------------------------------------|
| GET    | /api/bookmarks       | List bookmarks (search query + folder filter)    |
| POST   | /api/bookmarks       | Create bookmark (multipart: JSON + screenshot)   |
| PATCH  | /api/bookmarks/:id   | Update bookmark metadata/folder                  |
| DELETE | /api/bookmarks/:id   | Delete bookmark + screenshot file                |
| GET    | /api/folders         | List folder tree                                 |
| POST   | /api/folders         | Create folder                                    |
| PATCH  | /api/folders/:id     | Rename/move folder                               |
| DELETE | /api/folders/:id     | Delete folder (move bookmarks to root)           |

## Chrome Extension

- Manifest V3 with permissions: `activeTab`, `tabs`
- On click: captures screenshot via `chrome.tabs.captureVisibleTab()` (base64)
- Popup: editable title, URL (read-only), folder selector, description field
- Sends multipart POST to configured server URL
- Converts to WebP for smaller file size

## Web UI

- **Main view**: Grid of bookmark cards (screenshot thumbnail + title + URL)
- **Sidebar**: Folder tree navigation
- **Top bar**: Search input (full-text over title, URL, description)
- **Card click**: Opens URL in new tab
- **Card menu**: Edit, move to folder, delete

## Deployment

Single Docker container. Data volume at `/app/data` for DB + screenshots.

```dockerfile
FROM node:20-alpine
# ... build and run Next.js
VOLUME /app/data
EXPOSE 3000
```

## Decisions

- **Chrome extension captures screenshots** (not server-side) — keeps server lightweight, no Puppeteer/Playwright needed
- **SQLite** — zero-config, single file, perfect for single-user
- **Local filesystem for screenshots** — simple, no S3/object storage needed
- **No auth** — single user, protected via network/reverse proxy
- **WebP format** — good compression for screenshots
