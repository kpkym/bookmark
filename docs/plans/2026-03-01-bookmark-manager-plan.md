# Bookmark Manager Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a lightweight, self-hosted bookmark manager with screenshot capture via Chrome extension.

**Architecture:** Single Next.js 15 App Router application with SQLite (Drizzle ORM) for storage, local filesystem for screenshots, and a Manifest V3 Chrome extension that captures screenshots client-side and POSTs them to the API. No auth — single-user, network-protected.

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM, better-sqlite3, Chrome Extension Manifest V3, Docker

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `.gitignore`
- Create: `drizzle.config.ts`

**Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/kpkym/ooo/homelab/code/bookmark
bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-bun --turbopack
```

Accept defaults. This creates the full Next.js scaffold.

**Step 2: Install database dependencies**

Run:
```bash
bun add drizzle-orm better-sqlite3
bun add -d drizzle-kit @types/better-sqlite3
```

**Step 3: Create drizzle config**

Create `drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/bookmarks.db',
  },
})
```

**Step 4: Create data directories and update .gitignore**

Run:
```bash
mkdir -p data/screenshots
```

Append to `.gitignore`:
```
data/
```

**Step 5: Initialize git and commit**

Run:
```bash
git init
git add -A
git commit -m "chore: scaffold Next.js project with Drizzle ORM config"
```

---

### Task 2: Database Schema & Connection

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`

**Step 1: Define schema**

Create `src/db/schema.ts`:
```typescript
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const folders = sqliteTable('folders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  parentId: integer('parent_id').references((): any => folders.id, {
    onDelete: 'set null',
  }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const bookmarks = sqliteTable('bookmarks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  screenshotPath: text('screenshot_path'),
  folderId: integer('folder_id').references(() => folders.id, {
    onDelete: 'set null',
  }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})
```

**Step 2: Create database connection**

Create `src/db/index.ts`:
```typescript
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const dbDir = path.join(process.cwd(), 'data')
fs.mkdirSync(dbDir, { recursive: true })

const sqlite = new Database(path.join(dbDir, 'bookmarks.db'))
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
```

**Step 3: Generate and run migration**

Run:
```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

**Step 4: Verify DB was created**

Run:
```bash
ls -la data/bookmarks.db
```

**Step 5: Commit**

Run:
```bash
git add -A
git commit -m "feat: add database schema and connection (folders + bookmarks)"
```

---

### Task 3: Folders API

**Files:**
- Create: `src/app/api/folders/route.ts`
- Create: `src/app/api/folders/[id]/route.ts`

**Step 1: Create GET + POST for folders**

Create `src/app/api/folders/route.ts`:
```typescript
import { eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { folders } from '@/db/schema'

export async function GET() {
  const allFolders = await db.select().from(folders)
  return Response.json(allFolders)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, parentId } = body

  if (!name || typeof name !== 'string') {
    return new Response('name is required', { status: 400 })
  }

  const [folder] = await db
    .insert(folders)
    .values({
      name: name.trim(),
      parentId: parentId ?? null,
    })
    .returning()

  return Response.json(folder, { status: 201 })
}
```

**Step 2: Create PATCH + DELETE for folders/:id**

Create `src/app/api/folders/[id]/route.ts`:
```typescript
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { bookmarks, folders } from '@/db/schema'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { name, parentId } = body

  const updates: Record<string, any> = {}
  if (name !== undefined)
    updates.name = name.trim()
  if (parentId !== undefined)
    updates.parentId = parentId

  if (Object.keys(updates).length === 0) {
    return new Response('nothing to update', { status: 400 })
  }

  const [updated] = await db
    .update(folders)
    .set(updates)
    .where(eq(folders.id, Number(id)))
    .returning()

  if (!updated) {
    return new Response('folder not found', { status: 404 })
  }

  return Response.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const folderId = Number(id)

  // Move bookmarks in this folder to root
  await db
    .update(bookmarks)
    .set({ folderId: null })
    .where(eq(bookmarks.folderId, folderId))

  // Move child folders to root
  await db
    .update(folders)
    .set({ parentId: null })
    .where(eq(folders.parentId, folderId))

  await db.delete(folders).where(eq(folders.id, folderId))

  return new Response(null, { status: 204 })
}
```

**Step 3: Test manually**

Run:
```bash
bun run dev &
sleep 3
# Create a folder
curl -s -X POST http://localhost:3000/api/folders \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Folder"}' | jq .
# List folders
curl -s http://localhost:3000/api/folders | jq .
kill %1
```

**Step 4: Commit**

Run:
```bash
git add -A
git commit -m "feat: add folders API (CRUD)"
```

---

### Task 4: Bookmarks API

**Files:**
- Create: `src/app/api/bookmarks/route.ts`
- Create: `src/app/api/bookmarks/[id]/route.ts`
- Create: `src/lib/screenshots.ts`

**Step 1: Create screenshot utility**

Create `src/lib/screenshots.ts`:
```typescript
import fs from 'node:fs'
import path from 'node:path'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'data', 'screenshots')

export function ensureScreenshotDir() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

export async function saveScreenshot(
  id: number,
  file: File
): Promise<string> {
  ensureScreenshotDir()
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.type === 'image/webp' ? 'webp' : 'png'
  const filename = `${id}.${ext}`
  const filepath = path.join(SCREENSHOTS_DIR, filename)
  fs.writeFileSync(filepath, buffer)
  return filename
}

export function deleteScreenshot(filename: string) {
  const filepath = path.join(SCREENSHOTS_DIR, filename)
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath)
  }
}

export function getScreenshotPath(filename: string): string {
  return path.join(SCREENSHOTS_DIR, filename)
}
```

**Step 2: Create GET + POST for bookmarks**

Create `src/app/api/bookmarks/route.ts`:
```typescript
import { desc, eq, like, or } from 'drizzle-orm'
import { db } from '@/db'
import { bookmarks } from '@/db/schema'
import { saveScreenshot } from '@/lib/screenshots'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const folderId = searchParams.get('folderId')

  let where
  const conditions = []

  if (query) {
    const pattern = `%${query}%`
    conditions.push(
      or(
        like(bookmarks.title, pattern),
        like(bookmarks.url, pattern),
        like(bookmarks.description, pattern)
      )!
    )
  }

  if (folderId) {
    conditions.push(eq(bookmarks.folderId, Number(folderId)))
  }

  const results = await db
    .select()
    .from(bookmarks)
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : undefined) : undefined)
    .orderBy(desc(bookmarks.createdAt))

  // If we have multiple conditions, filter properly
  if (conditions.length > 1) {
    const allResults = await db
      .select()
      .from(bookmarks)
      .where(conditions[0])
      .orderBy(desc(bookmarks.createdAt))

    const filtered = allResults.filter(
      b => !folderId || b.folderId === Number(folderId)
    )
    return Response.json(filtered)
  }

  return Response.json(results)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const url = formData.get('url') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string | null
  const folderId = formData.get('folderId') as string | null
  const screenshot = formData.get('screenshot') as File | null

  if (!url || !title) {
    return new Response('url and title are required', { status: 400 })
  }

  const [bookmark] = await db
    .insert(bookmarks)
    .values({
      url,
      title: title.trim(),
      description: description?.trim() || null,
      folderId: folderId ? Number(folderId) : null,
    })
    .returning()

  if (screenshot && screenshot.size > 0) {
    const filename = await saveScreenshot(bookmark.id, screenshot)
    await db
      .update(bookmarks)
      .set({ screenshotPath: filename })
      .where(eq(bookmarks.id, bookmark.id))
    bookmark.screenshotPath = filename
  }

  return Response.json(bookmark, { status: 201 })
}
```

**Step 3: Create PATCH + DELETE for bookmarks/:id**

Create `src/app/api/bookmarks/[id]/route.ts`:
```typescript
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { bookmarks } from '@/db/schema'
import { deleteScreenshot } from '@/lib/screenshots'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { title, description, folderId } = body

  const updates: Record<string, any> = {
    updatedAt: new Date(),
  }
  if (title !== undefined)
    updates.title = title.trim()
  if (description !== undefined)
    updates.description = description?.trim() || null
  if (folderId !== undefined)
    updates.folderId = folderId

  const [updated] = await db
    .update(bookmarks)
    .set(updates)
    .where(eq(bookmarks.id, Number(id)))
    .returning()

  if (!updated) {
    return new Response('bookmark not found', { status: 404 })
  }

  return Response.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [bookmark] = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.id, Number(id)))

  if (!bookmark) {
    return new Response('bookmark not found', { status: 404 })
  }

  if (bookmark.screenshotPath) {
    deleteScreenshot(bookmark.screenshotPath)
  }

  await db.delete(bookmarks).where(eq(bookmarks.id, Number(id)))
  return new Response(null, { status: 204 })
}
```

**Step 4: Serve screenshots as static files**

Create `src/app/api/screenshots/[filename]/route.ts`:
```typescript
import fs from 'node:fs'
import { getScreenshotPath } from '@/lib/screenshots'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  const filepath = getScreenshotPath(filename)

  if (!fs.existsSync(filepath)) {
    return new Response('not found', { status: 404 })
  }

  const buffer = fs.readFileSync(filepath)
  const contentType = filename.endsWith('.webp')
    ? 'image/webp'
    : 'image/png'

  return new Response(buffer, {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000' },
  })
}
```

**Step 5: Test manually**

Run:
```bash
bun run dev &
sleep 3
# Create a bookmark without screenshot
curl -s -X POST http://localhost:3000/api/bookmarks \
  -F "url=https://example.com" \
  -F "title=Example Site" \
  -F "description=A test bookmark" | jq .
# List bookmarks
curl -s http://localhost:3000/api/bookmarks | jq .
# Search
curl -s "http://localhost:3000/api/bookmarks?q=example" | jq .
kill %1
```

**Step 6: Commit**

Run:
```bash
git add -A
git commit -m "feat: add bookmarks API (CRUD with screenshot upload/serve)"
```

---

### Task 5: Web UI — Layout & Folder Sidebar

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/page.tsx` (replace scaffold)
- Create: `src/components/sidebar.tsx`
- Create: `src/components/folder-tree.tsx`

**Step 1: Create folder tree component**

Create `src/components/folder-tree.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'

interface Folder {
  id: number
  name: string
  parentId: number | null
}

interface Props {
  selectedFolderId: number | null
  onSelectFolder: (id: number | null) => void
}

export function FolderTree({ selectedFolderId, onSelectFolder }: Props) {
  const [folders, setFolders] = useState<Folder[]>([])

  useEffect(() => {
    fetch('/api/folders')
      .then(r => r.json())
      .then(setFolders)
  }, [])

  const rootFolders = folders.filter(f => f.parentId === null)

  function renderFolder(folder: Folder, depth: number = 0) {
    const children = folders.filter(f => f.parentId === folder.id)
    const isSelected = selectedFolderId === folder.id

    return (
      <div key={folder.id}>
        <button
          onClick={() => onSelectFolder(folder.id)}
          className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
            isSelected ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {folder.name}
        </button>
        {children.map(c => renderFolder(c, depth + 1))}
      </div>
    )
  }

  return (
    <nav className="space-y-0.5">
      <button
        onClick={() => onSelectFolder(null)}
        className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
          selectedFolderId === null ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''
        }`}
      >
        All Bookmarks
      </button>
      {rootFolders.map(f => renderFolder(f))}
    </nav>
  )
}
```

**Step 2: Create sidebar component**

Create `src/components/sidebar.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { FolderTree } from './folder-tree'

interface Props {
  selectedFolderId: number | null
  onSelectFolder: (id: number | null) => void
}

export function Sidebar({ selectedFolderId, onSelectFolder }: Props) {
  const [newFolderName, setNewFolderName] = useState('')

  async function createFolder() {
    if (!newFolderName.trim())
      return
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() }),
    })
    setNewFolderName('')
    // Trigger re-render by changing key — simple approach
    window.location.reload()
  }

  return (
    <aside className="w-60 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-4">
      <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
        Folders
      </h2>
      <FolderTree
        selectedFolderId={selectedFolderId}
        onSelectFolder={onSelectFolder}
      />
      <div className="mt-auto">
        <input
          type="text"
          placeholder="New folder..."
          value={newFolderName}
          onChange={e => setNewFolderName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createFolder()}
          className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-900 dark:border-gray-700"
        />
      </div>
    </aside>
  )
}
```

**Step 3: Commit**

Run:
```bash
git add -A
git commit -m "feat: add sidebar with folder tree navigation"
```

---

### Task 6: Web UI — Bookmark Grid & Search

**Files:**
- Create: `src/components/bookmark-grid.tsx`
- Create: `src/components/bookmark-card.tsx`
- Create: `src/components/search-bar.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create bookmark card component**

Create `src/components/bookmark-card.tsx`:
```tsx
'use client'

import { useState } from 'react'

interface Bookmark {
  id: number
  url: string
  title: string
  description: string | null
  screenshotPath: string | null
  folderId: number | null
  createdAt: string
}

interface Props {
  bookmark: Bookmark
  onDelete: (id: number) => void
}

export function BookmarkCard({ bookmark, onDelete }: Props) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="group relative rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
      <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
        {bookmark.screenshotPath
          ? (
              <img
                src={`/api/screenshots/${bookmark.screenshotPath}`}
                alt={bookmark.title}
                className="w-full h-40 object-cover object-top"
                loading="lazy"
              />
            )
          : (
              <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
                No screenshot
              </div>
            )}
      </a>
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{bookmark.title}</h3>
        <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
        {bookmark.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
            {bookmark.description}
          </p>
        )}
      </div>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/50 text-white rounded px-2 py-0.5 text-xs transition-opacity"
      >
        ...
      </button>
      {showMenu && (
        <div className="absolute top-8 right-2 bg-white dark:bg-gray-900 border rounded shadow-lg z-10">
          <button
            onClick={() => {
              onDelete(bookmark.id)
              setShowMenu(false)
            }}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create bookmark grid component**

Create `src/components/bookmark-grid.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { BookmarkCard } from './bookmark-card'

interface Bookmark {
  id: number
  url: string
  title: string
  description: string | null
  screenshotPath: string | null
  folderId: number | null
  createdAt: string
}

interface Props {
  searchQuery: string
  folderId: number | null
}

export function BookmarkGrid({ searchQuery, folderId }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery)
      params.set('q', searchQuery)
    if (folderId !== null)
      params.set('folderId', String(folderId))

    fetch(`/api/bookmarks?${params}`)
      .then(r => r.json())
      .then(setBookmarks)
  }, [searchQuery, folderId])

  async function handleDelete(id: number) {
    await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No bookmarks yet. Use the Chrome extension to save some!
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {bookmarks.map(b => (
        <BookmarkCard key={b.id} bookmark={b} onDelete={handleDelete} />
      ))}
    </div>
  )
}
```

**Step 3: Create search bar**

Create `src/components/search-bar.tsx`:
```tsx
'use client'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <input
      type="search"
      placeholder="Search bookmarks..."
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full max-w-md px-4 py-2 text-sm border rounded-lg dark:bg-gray-900 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}
```

**Step 4: Wire up the main page**

Replace `src/app/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { BookmarkGrid } from '@/components/bookmark-grid'
import { SearchBar } from '@/components/search-bar'
import { Sidebar } from '@/components/sidebar'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)

  return (
    <div className="flex h-screen">
      <Sidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-gray-200 dark:border-gray-800 p-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </header>
        <div className="flex-1 overflow-y-auto">
          <BookmarkGrid searchQuery={searchQuery} folderId={selectedFolderId} />
        </div>
      </main>
    </div>
  )
}
```

**Step 5: Test — run dev server and verify UI renders**

Run:
```bash
bun run dev
```

Open http://localhost:3000 — should show empty state with sidebar and search bar.

**Step 6: Commit**

Run:
```bash
git add -A
git commit -m "feat: add web UI with bookmark grid, search bar, and folder sidebar"
```

---

### Task 7: Chrome Extension

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/popup.html`
- Create: `extension/popup.js`
- Create: `extension/popup.css`
- Create: `extension/background.js`
- Create: `extension/icons/` (placeholder)

**Step 1: Create extension manifest**

Create `extension/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "Bookmark Screenshot",
  "version": "1.0.0",
  "description": "Save bookmarks with screenshots",
  "permissions": ["activeTab", "tabs"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Step 2: Create popup HTML**

Create `extension/popup.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>Save Bookmark</h1>
    <div class="field">
      <label>Title</label>
      <input type="text" id="title">
    </div>
    <div class="field">
      <label>URL</label>
      <input type="text" id="url" readonly>
    </div>
    <div class="field">
      <label>Description</label>
      <textarea id="description" rows="2"></textarea>
    </div>
    <div class="field">
      <label>Folder</label>
      <select id="folder">
        <option value="">No folder</option>
      </select>
    </div>
    <div id="preview">
      <img id="screenshot-preview" alt="Screenshot preview">
    </div>
    <div class="field">
      <label>Server URL</label>
      <input type="text" id="serverUrl" placeholder="http://localhost:3000">
    </div>
    <button id="save" class="btn-primary">Save Bookmark</button>
    <div id="status"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

**Step 3: Create popup CSS**

Create `extension/popup.css`:
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 350px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; }
.container { padding: 16px; }
h1 { font-size: 16px; margin-bottom: 12px; }
.field { margin-bottom: 10px; }
label { display: block; font-size: 11px; color: #666; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }
input[readonly] { background: #f5f5f5; color: #888; }
textarea { resize: vertical; }
#preview { margin-bottom: 10px; border-radius: 6px; overflow: hidden; border: 1px solid #ddd; }
#preview img { width: 100%; display: block; }
.btn-primary { width: 100%; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 500; }
.btn-primary:hover { background: #1d4ed8; }
.btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }
#status { margin-top: 8px; text-align: center; font-size: 12px; }
.success { color: #16a34a; }
.error { color: #dc2626; }
```

**Step 4: Create popup JavaScript**

Create `extension/popup.js`:
```javascript
let screenshotDataUrl = null

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved server URL
  const stored = await chrome.storage.local.get('serverUrl')
  const serverUrlInput = document.getElementById('serverUrl')
  serverUrlInput.value = stored.serverUrl || 'http://localhost:3000'

  // Save server URL on change
  serverUrlInput.addEventListener('change', () => {
    chrome.storage.local.set({ serverUrl: serverUrlInput.value })
  })

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  document.getElementById('title').value = tab.title || ''
  document.getElementById('url').value = tab.url || ''

  // Capture screenshot
  try {
    screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
    })
    document.getElementById('screenshot-preview').src = screenshotDataUrl
  }
  catch (err) {
    console.error('Failed to capture screenshot:', err)
  }

  // Load folders
  try {
    const serverUrl = serverUrlInput.value
    const res = await fetch(`${serverUrl}/api/folders`)
    const folders = await res.json()
    const select = document.getElementById('folder')
    folders.forEach((f) => {
      const option = document.createElement('option')
      option.value = f.id
      option.textContent = f.name
      select.appendChild(option)
    })
  }
  catch (err) {
    console.error('Failed to load folders:', err)
  }

  // Save button
  document.getElementById('save').addEventListener('click', saveBookmark)
})

async function saveBookmark() {
  const btn = document.getElementById('save')
  const status = document.getElementById('status')
  btn.disabled = true
  status.textContent = 'Saving...'
  status.className = ''

  const serverUrl = document.getElementById('serverUrl').value
  const formData = new FormData()
  formData.append('url', document.getElementById('url').value)
  formData.append('title', document.getElementById('title').value)
  formData.append('description', document.getElementById('description').value)

  const folderId = document.getElementById('folder').value
  if (folderId)
    formData.append('folderId', folderId)

  if (screenshotDataUrl) {
    const blob = await (await fetch(screenshotDataUrl)).blob()
    formData.append('screenshot', blob, 'screenshot.png')
  }

  try {
    const res = await fetch(`${serverUrl}/api/bookmarks`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok)
      throw new Error(`HTTP ${res.status}`)

    status.textContent = 'Saved!'
    status.className = 'success'
    setTimeout(() => window.close(), 1000)
  }
  catch (err) {
    status.textContent = `Error: ${err.message}`
    status.className = 'error'
    btn.disabled = false
  }
}
```

**Step 5: Update manifest to add storage permission**

The popup uses `chrome.storage.local` for the server URL, so update `extension/manifest.json` permissions:
```json
"permissions": ["activeTab", "tabs", "storage"]
```

**Step 6: Create placeholder icons**

Run:
```bash
mkdir -p extension/icons
# Generate simple placeholder SVG-based PNGs (or use any 16x16, 48x48, 128x128 PNG)
```

Note: For now, use any bookmark icon PNGs. Can generate proper ones later.

**Step 7: Commit**

Run:
```bash
git add -A
git commit -m "feat: add Chrome extension with screenshot capture and bookmark save"
```

---

### Task 8: CORS Configuration for Extension

**Files:**
- Modify: `next.config.ts`

**Step 1: Add CORS headers for API routes**

The Chrome extension runs from `chrome-extension://` origin and needs CORS headers. Update `next.config.ts`:
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ]
  },
}

export default nextConfig
```

**Step 2: Add OPTIONS handler for preflight**

Create `src/app/api/[...path]/route.ts`:
```typescript
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
```

Note: This catch-all OPTIONS handler may conflict with specific route handlers. An alternative is adding OPTIONS exports to each route file. Evaluate during testing and adjust.

**Step 3: Commit**

Run:
```bash
git add -A
git commit -m "feat: add CORS support for Chrome extension"
```

---

### Task 9: Docker Deployment

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Step 1: Create .dockerignore**

Create `.dockerignore`:
```
node_modules
.next
data
.git
extension
```

**Step 2: Create Dockerfile**

Create `Dockerfile`:
```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle

RUN mkdir -p /app/data/screenshots
VOLUME /app/data
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]
```

**Step 3: Update next.config.ts for standalone output**

Add `output: "standalone"` to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  // ... existing headers config
}
```

**Step 4: Create docker-compose.yml**

Create `docker-compose.yml`:
```yaml
services:
  bookmark:
    build: .
    ports:
      - '3000:3000'
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

**Step 5: Commit**

Run:
```bash
git add -A
git commit -m "feat: add Docker deployment (Dockerfile + docker-compose)"
```

---

### Task 10: Final Polish & Testing

**Step 1: Run the full app locally**

Run:
```bash
bun run dev
```

Test:
1. Open http://localhost:3000 — verify UI renders
2. Create a folder via sidebar
3. Load extension in Chrome (`chrome://extensions` → Load unpacked → select `extension/`)
4. Navigate to any website, click extension, save bookmark
5. Verify bookmark appears in UI with screenshot
6. Test search
7. Test folder filtering
8. Test delete

**Step 2: Fix any issues found during testing**

Address bugs found in step 1.

**Step 3: Final commit**

Run:
```bash
git add -A
git commit -m "chore: final polish and fixes"
```
