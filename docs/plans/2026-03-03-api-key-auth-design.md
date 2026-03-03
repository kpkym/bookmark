# API Key Auth for Chrome Extension

**Date:** 2026-03-03
**Status:** Approved

## Problem

When Traefik + Authelia protect the bookmark app with forward auth, the Chrome extension's API requests are blocked. The extension makes plain `fetch()` calls with no Authelia session cookie, so Authelia returns 302 to the login page.

## Solution

- Authelia bypasses `/api/*` routes (no session required)
- Next.js middleware enforces an optional `x-api-key` header on all `/api/*` requests
- The extension stores the API key in settings and sends it as a header

## Architecture

```
Browser (web UI) → Traefik → Authelia (one_factor)      → Next.js app
Extension         → Traefik → Authelia (bypass /api/*)   → Next.js middleware (x-api-key) → API routes
```

## Components

### 1. Next.js Middleware (`src/middleware.ts`)

- Intercepts all `/api/*` requests
- If `API_KEY` env var is **not set**: skips check, request passes through
- If `API_KEY` env var **is set**: reads `x-api-key` header, returns `401` if missing or wrong

### 2. Docker Compose (`docker-compose.yml`)

- Add optional `API_KEY` environment variable

### 3. Extension Options (`extension/options.html` + `extension/options.js`)

- Add "API Key" input field alongside existing Server URL field
- Saved to `chrome.storage.local` as `apiKey`

### 4. Extension Popup (`extension/popup.js`)

- Read `apiKey` from storage
- Add `x-api-key: <key>` header to all fetch calls (`GET /api/folders`, `POST /api/bookmarks`)

### 5. Authelia Config (user-managed, not in repo)

```yaml
access_control:
  rules:
    - domain: bookmarks.example.com
      policy: bypass
      resources:
        - "^/api/.*"
    - domain: bookmarks.example.com
      policy: one_factor
```

## Error Handling

| Condition | Behavior |
|-----------|----------|
| `API_KEY` not set | All API requests pass through (no key required) |
| `API_KEY` set, correct key sent | Request passes through |
| `API_KEY` set, wrong/missing key | Middleware returns `401 Unauthorized` |

## What Does Not Change

- Database schema and migrations
- Existing API route logic
- Authelia/Traefik configuration (user manages this)
