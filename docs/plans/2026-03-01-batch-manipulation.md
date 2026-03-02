# Batch Manipulation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add batch select, delete, and move-to-folder for bookmarks via a toggle-based selection mode with floating toolbar.

**Architecture:** Toggle "Select" button enters batch mode. Cards show checkboxes, clicks toggle selection. Floating toolbar at bottom provides batch actions. State lifted to page.tsx. Reuses existing individual API endpoints fired in parallel.

**Tech Stack:** Next.js (React), TypeScript, Tailwind CSS 4

---

### Task 1: Extract Bookmark type to shared location

**Files:**
- Create: `src/types/bookmark.ts`
- Modify: `src/components/bookmark-grid.tsx`
- Modify: `src/components/bookmark-card.tsx`

**Step 1: Create shared Bookmark type**

Create `src/types/bookmark.ts`:
```typescript
export interface Bookmark {
  id: number
  url: string
  title: string
  description: string | null
  screenshotPath: string | null
  folderId: number | null
  createdAt: string
}
```

**Step 2: Update bookmark-grid.tsx to use shared type**

Remove the local `Bookmark` type (lines 6-14) and add import:
```typescript
import { Bookmark } from '@/types/bookmark'
```

**Step 3: Update bookmark-card.tsx to use shared type**

Remove the local `Bookmark` type (lines 5-13) and add import:
```typescript
import { Bookmark } from '@/types/bookmark'
```

**Step 4: Verify dev server runs without errors**

Run: `bun run dev` and check for compilation errors.

**Step 5: Commit**

```
feat: extract shared Bookmark type
```

---

### Task 2: Lift bookmarks state from BookmarkGrid to page.tsx

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/bookmark-grid.tsx`

**Step 1: Modify page.tsx to own bookmarks state and fetch logic**

Replace `src/app/page.tsx` with:
```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { BookmarkGrid } from "@/components/bookmark-grid";
import { SearchBar } from "@/components/search-bar";
import { Bookmark } from "@/types/bookmark";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const fetchBookmarks = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedFolderId !== null) params.set("folderId", String(selectedFolderId));

    fetch(`/api/bookmarks?${params}`)
      .then((r) => r.json())
      .then(setBookmarks);
  }, [searchQuery, selectedFolderId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  function handleDelete(id: number) {
    fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

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
          <BookmarkGrid
            bookmarks={bookmarks}
            onDelete={handleDelete}
          />
        </div>
      </main>
    </div>
  );
}
```

**Step 2: Simplify BookmarkGrid to receive props**

Replace `src/components/bookmark-grid.tsx` with:
```typescript
"use client";

import { BookmarkCard } from "./bookmark-card";
import { Bookmark } from "@/types/bookmark";

type Props = {
  bookmarks: Bookmark[];
  onDelete: (id: number) => void;
};

export function BookmarkGrid({ bookmarks, onDelete }: Props) {
  if (bookmarks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No bookmarks yet. Use the Chrome extension to save some!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {bookmarks.map((b) => (
        <BookmarkCard key={b.id} bookmark={b} onDelete={onDelete} />
      ))}
    </div>
  );
}
```

**Step 3: Verify functionality is unchanged**

Run: `bun run dev`, open browser, confirm bookmarks load, search works, folder filtering works, delete works.

**Step 4: Commit**

```
refactor: lift bookmarks state to page.tsx
```

---

### Task 3: Add batch mode state and Select toggle button

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add batch mode state and toggle button to header**

In `page.tsx`, add state after the bookmarks state:
```typescript
const [batchMode, setBatchMode] = useState(false)
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
```

Add a toggle handler:
```typescript
function toggleBatchMode() {
  if (batchMode) {
    setSelectedIds(new Set())
  }
  setBatchMode(!batchMode)
}

function toggleSelection(id: number) {
  setSelectedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id))
      next.delete(id)
    else next.add(id)
    return next
  })
}
```

Update the header to include the Select button alongside the search bar:
```tsx
<header className="border-b border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
  <div className="flex-1">
    <SearchBar value={searchQuery} onChange={setSearchQuery} />
  </div>
  <button
    onClick={toggleBatchMode}
    className={`px-3 py-1.5 text-sm rounded border transition-colors ${
      batchMode
        ? 'bg-blue-600 text-white border-blue-600'
        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}
  >
    {batchMode ? 'Cancel' : 'Select'}
  </button>
</header>
```

**Step 2: Pass batch props to BookmarkGrid**

Update BookmarkGrid usage:
```tsx
<BookmarkGrid
  bookmarks={bookmarks}
  onDelete={handleDelete}
  batchMode={batchMode}
  selectedIds={selectedIds}
  onToggleSelect={toggleSelection}
/>
```

**Step 3: Verify toggle button renders and toggles**

Run: `bun run dev`, confirm "Select" button appears, changes to "Cancel" when clicked.

**Step 4: Commit**

```
feat: add batch mode toggle button in header
```

---

### Task 4: Add selection UI to BookmarkCard

**Files:**
- Modify: `src/components/bookmark-grid.tsx`
- Modify: `src/components/bookmark-card.tsx`

**Step 1: Update BookmarkGrid Props to pass batch state**

Update `src/components/bookmark-grid.tsx`:
```typescript
type Props = {
  bookmarks: Bookmark[];
  onDelete: (id: number) => void;
  batchMode: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
};

export function BookmarkGrid({ bookmarks, onDelete, batchMode, selectedIds, onToggleSelect }: Props) {
```

Update the card rendering:
```tsx
<BookmarkCard
  key={b.id}
  bookmark={b}
  onDelete={onDelete}
  batchMode={batchMode}
  selected={selectedIds.has(b.id)}
  onToggleSelect={onToggleSelect}
/>
```

**Step 2: Update BookmarkCard to support batch mode**

Update `src/components/bookmark-card.tsx` Props type:
```typescript
interface Props {
  bookmark: Bookmark
  onDelete: (id: number) => void
  batchMode: boolean
  selected: boolean
  onToggleSelect: (id: number) => void
}
```

Update the component to destructure new props:
```typescript
export function BookmarkCard({ bookmark, onDelete, batchMode, selected, onToggleSelect }: Props) {
```

Add an `onClick` handler on the outer `<div>` that intercepts clicks in batch mode. Wrap the `<a>` tag so it's disabled in batch mode. Add a checkbox overlay:

Replace the outer div and its contents with:
```tsx
<div
  onClick={batchMode ? () => onToggleSelect(bookmark.id) : undefined}
  className={`group relative rounded-lg border overflow-hidden transition-shadow cursor-pointer ${
    batchMode && selected
      ? 'border-blue-500 ring-2 ring-blue-500/30'
      : 'border-gray-200 dark:border-gray-800 hover:shadow-md'
  }`}
>
  {batchMode && (
    <div className="absolute top-2 left-2 z-10">
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
        selected
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'border-gray-400 bg-white/80'
      }`}
      >
        {selected && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
  )}
  {batchMode ? (
    <div className="select-none pointer-events-none">
      {bookmark.screenshotPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/screenshots/${bookmark.screenshotPath}`}
          alt={bookmark.title}
          className="w-full h-40 object-cover object-top"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
          No screenshot
        </div>
      )}
    </div>
  ) : (
    <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
      {bookmark.screenshotPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/screenshots/${bookmark.screenshotPath}`}
          alt={bookmark.title}
          className="w-full h-40 object-cover object-top"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
          No screenshot
        </div>
      )}
    </a>
  )}
  <div className="p-3">
    <h3 className="font-medium text-sm truncate">{bookmark.title}</h3>
    <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
    {bookmark.description && (
      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
        {bookmark.description}
      </p>
    )}
  </div>
  {!batchMode && (
    <div ref={menuRef}>
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
  )}
</div>
```

**Step 3: Verify batch selection works**

Run: `bun run dev`, click "Select", click cards — confirm checkbox toggles, blue ring appears on selected cards, clicking "Cancel" clears all.

**Step 4: Commit**

```
feat: add checkbox selection UI in batch mode
```

---

### Task 5: Create BatchToolbar component

**Files:**
- Create: `src/components/batch-toolbar.tsx`

**Step 1: Create the toolbar component**

Create `src/components/batch-toolbar.tsx`:
```typescript
"use client";

import { useState } from "react";

type Folder = {
  id: number;
  name: string;
  parentId: number | null;
};

type Props = {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onMove: (folderId: number | null) => void;
  onCancel: () => void;
};

export function BatchToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onMove,
  onCancel,
}: Props) {
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);

  const allSelected = selectedCount === totalCount && totalCount > 0;

  function handleToggleAll() {
    if (allSelected) onDeselectAll();
    else onSelectAll();
  }

  async function openFolderPicker() {
    const res = await fetch("/api/folders");
    const data = await res.json();
    setFolders(data);
    setShowFolderPicker(true);
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 z-50">
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedCount} selected
      </span>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      <button
        onClick={handleToggleAll}
        className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 whitespace-nowrap"
      >
        {allSelected ? "Deselect all" : "Select all"}
      </button>

      <div className="relative">
        <button
          onClick={openFolderPicker}
          disabled={selectedCount === 0}
          className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          Move
        </button>
        {showFolderPicker && (
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-900 border rounded-lg shadow-xl z-50 min-w-48 max-h-60 overflow-y-auto">
            <button
              onClick={() => { onMove(null); setShowFolderPicker(false); }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              No folder (root)
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => { onMove(f.id); setShowFolderPicker(false); }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {showDeleteConfirm ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-red-600">Delete {selectedCount}?</span>
          <button
            onClick={() => { onDelete(); setShowDeleteConfirm(false); }}
            className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
          >
            Confirm
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={selectedCount === 0}
          className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          Delete
        </button>
      )}

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      <button
        onClick={onCancel}
        className="px-2 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `bun run dev`, check for compilation errors.

**Step 3: Commit**

```
feat: create BatchToolbar component
```

---

### Task 6: Wire BatchToolbar into page.tsx with batch actions

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Import BatchToolbar and add batch action handlers**

Add import:
```typescript
import { BatchToolbar } from '@/components/batch-toolbar'
```

Add batch action handlers after `toggleSelection`:
```typescript
function selectAll() {
  setSelectedIds(new Set(bookmarks.map(b => b.id)))
}

function deselectAll() {
  setSelectedIds(new Set())
}

async function batchDelete() {
  const ids = Array.from(selectedIds)
  await Promise.all(ids.map(id => fetch(`/api/bookmarks/${id}`, { method: 'DELETE' })))
  setBookmarks(prev => prev.filter(b => !selectedIds.has(b.id)))
  setSelectedIds(new Set())
  setBatchMode(false)
}

async function batchMove(folderId: number | null) {
  const ids = Array.from(selectedIds)
  await Promise.all(
    ids.map(id =>
      fetch(`/api/bookmarks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })
    )
  )
  setBookmarks(prev =>
    prev.map(b => (selectedIds.has(b.id) ? { ...b, folderId } : b))
  )
  setSelectedIds(new Set())
  setBatchMode(false)
}
```

**Step 2: Render BatchToolbar when in batch mode**

Add the toolbar inside the return, after the `</main>` close tag but before the outer `</div>`:
```tsx
{ batchMode && (
  <BatchToolbar
    selectedCount={selectedIds.size}
    totalCount={bookmarks.length}
    onSelectAll={selectAll}
    onDeselectAll={deselectAll}
    onDelete={batchDelete}
    onMove={batchMove}
    onCancel={toggleBatchMode}
  />
) }
```

**Step 3: Verify full batch flow works**

Run: `bun run dev`. Test:
1. Click "Select" — toolbar appears at bottom
2. Click cards to select — count updates
3. Click "Select all" — all cards selected
4. Click "Move" — folder picker appears, select a folder
5. Click "Select", select cards, click "Delete" — confirm dialog, cards removed
6. Click Cancel (X) — exits batch mode

**Step 4: Commit**

```
feat: wire batch delete and move-to-folder actions
```

---

### Task 7: Lint check and final cleanup

**Files:**
- All modified files

**Step 1: Run linter**

Run: `bun run lint`

Fix any issues found.

**Step 2: Run build**

Run: `bun run build`

Fix any issues found.

**Step 3: Commit any fixes**

```
fix: resolve lint/build errors
```
