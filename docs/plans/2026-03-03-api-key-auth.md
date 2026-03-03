# API Key Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Protect all `/api/*` routes with an optional `x-api-key` header so the Chrome extension can bypass Authelia forward auth.

**Architecture:** Next.js middleware intercepts all `/api/*` requests and validates the `x-api-key` header against the `API_KEY` env var (if set). The extension stores the key in `chrome.storage.local` and sends it on every request. If `API_KEY` is not set, the check is skipped entirely.

**Tech Stack:** Next.js 16 middleware, Chrome Extension Manifest V3, Bun, Docker Compose

---

### Task 1: Next.js Middleware

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create the middleware**

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const apiKey = process.env.API_KEY
  if (!apiKey) return NextResponse.next()

  const header = req.headers.get('x-api-key')
  if (header !== apiKey) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

**Step 2: Verify it builds**

Run: `bun run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add optional API key middleware for /api/* routes"
```

---

### Task 2: Docker Compose — API_KEY env var

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Add the env var**

Change `docker-compose.yml` from:
```yaml
services:
  bookmark:
    build: .
    ports:
      - '3136:3000'
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

To:
```yaml
services:
  bookmark:
    build: .
    ports:
      - '3136:3000'
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    environment:
      - API_KEY=${API_KEY:-}
```

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: pass API_KEY env var to bookmark container"
```

---

### Task 3: Extension Options — Add API Key Field

**Files:**
- Modify: `extension/options.html`
- Modify: `extension/options.js`

**Step 1: Add input field to options.html**

Add this block after the Server URL field (before `<button id="save">`):

```html
    <div class="field">
      <label>API Key</label>
      <input type="password" id="apiKey" placeholder="Leave empty if not required">
      <p class="hint">Must match API_KEY on the server. Leave blank if not set.</p>
    </div>
```

**Step 2: Update options.js to load and save apiKey**

Replace the entire `options.js` with:

```js
document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['serverUrl', 'apiKey'])
  document.getElementById('serverUrl').value = stored.serverUrl || 'http://localhost:3136'
  document.getElementById('apiKey').value = stored.apiKey || ''

  document.getElementById('save').addEventListener('click', async () => {
    const serverUrl = document.getElementById('serverUrl').value.trim().replace(/\/$/, '')
    const apiKey = document.getElementById('apiKey').value.trim()
    await chrome.storage.local.set({ serverUrl, apiKey })
    const status = document.getElementById('status')
    status.textContent = 'Saved!'
    setTimeout(() => { status.textContent = '' }, 2000)
  })
})
```

**Step 3: Commit**

```bash
git add extension/options.html extension/options.js
git commit -m "feat: add API key field to extension settings"
```

---

### Task 4: Extension Popup — Send x-api-key Header

**Files:**
- Modify: `extension/popup.js`

**Step 1: Update popup.js to read apiKey and send header**

Two fetch calls need updating: the folder load and the bookmark save.

In `popup.js`, change the storage read at the top of `DOMContentLoaded` from:
```js
  const stored = await chrome.storage.local.get('serverUrl')
  const serverUrl = stored.serverUrl || 'http://localhost:3136'
```
To:
```js
  const stored = await chrome.storage.local.get(['serverUrl', 'apiKey'])
  const serverUrl = stored.serverUrl || 'http://localhost:3136'
  const apiKey = stored.apiKey || ''
```

Change the folders fetch from:
```js
    const res = await fetch(`${serverUrl}/api/folders`)
```
To:
```js
    const res = await fetch(`${serverUrl}/api/folders`, {
      headers: apiKey ? { 'x-api-key': apiKey } : {},
    })
```

In `saveBookmark`, change the storage read from:
```js
  const { serverUrl = 'http://localhost:3136' } = await chrome.storage.local.get('serverUrl')
```
To:
```js
  const { serverUrl = 'http://localhost:3136', apiKey = '' } = await chrome.storage.local.get(['serverUrl', 'apiKey'])
```

Change the bookmarks fetch from:
```js
    const res = await fetch(`${serverUrl}/api/bookmarks`, {
      method: 'POST',
      body: formData,
    })
```
To:
```js
    const res = await fetch(`${serverUrl}/api/bookmarks`, {
      method: 'POST',
      headers: apiKey ? { 'x-api-key': apiKey } : {},
      body: formData,
    })
```

**Step 2: Commit**

```bash
git add extension/popup.js
git commit -m "feat: send x-api-key header from extension on all API requests"
```

---

## Manual Testing

1. **Without API_KEY set (local dev):**
   - Run `bun run dev`
   - Extension should save bookmarks normally with no key configured

2. **With API_KEY set:**
   - `API_KEY=secret bun run dev`
   - Extension with wrong/empty key → status shows `Error: HTTP 401`
   - Extension with correct key in settings → saves successfully

3. **Authelia reference config** (manage in your reverse proxy setup):
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
