# Design: Folder Label on Bookmark Cards + Drag Bookmarks to Folders

**Date:** 2026-03-02

## Goals

1. Show which folder a bookmark belongs to on its card (only in "All Bookmarks" view).
2. Allow dragging a bookmark card onto a folder in the sidebar to move it.

## Architecture

### Lift folders state to `page.tsx`

Currently `FolderTree` owns `folders: Folder[]` and `fetchFolders`. Both new features need folder data at the page level:

- The folder name label on bookmark cards requires a `folderId → name` map.
- The page-level drag end handler needs the `folders` array to perform the descendant cycle check for folder reparenting.

`FolderTree` becomes a controlled component for folders: receives `folders` and `fetchFolders` as props instead of managing them internally.

### Single `DndContext` at page level

The `DndContext` moves from inside `FolderTree` to `page.tsx`, wrapping the full `<div class="flex h-screen">`. This puts bookmark cards and folder items in the same drag context.

A single `handleDragEnd` in `page.tsx` reads `active.data.current.type`:

- `'folder'` → run folder-reparent logic (existing, just relocated from `FolderTree`)
- `'bookmark'` → PATCH `/api/bookmarks/{id}` with `{ folderId }`, update local bookmarks state

## Component Changes

### `page.tsx`

- Add `folders` state and `fetchFolders`.
- Pass `folders` and `fetchFolders` to `<Sidebar>` → `<FolderTree>`.
- Wrap layout in `<DndContext>` with unified `handleDragEnd`.
- Build `folderNameMap: Record<number, string>` from folders array.
- Pass `folderNameMap` and `selectedFolderId` to `<BookmarkGrid>`.

### `FolderTree`

- Remove internal `folders` state and `fetchFolders`.
- Accept `folders: Folder[]` and `fetchFolders: () => void` as props.
- Remove `DndContext` wrapper (now in page).
- Keep all internal UI state: `expandedIds`, `contextMenu`, `editingId`, `creatingUnder`, etc.
- Folder items keep `useDraggable` (data: `{ type: 'folder' }`) and `useDroppable`.

### `BookmarkCard`

- Add `useDraggable` with `id: bookmark-{id}` and `data: { type: 'bookmark', bookmarkId: id }`.
- Accept `folderName: string | null` prop.
- Render a small folder pill below the URL when `folderName` is non-null.
- Apply drag transform via `CSS.Translate.toString(transform)` on the card wrapper.

### `BookmarkGrid`

- Accept `folderNameMap: Record<number, string>` and `selectedFolderId: number | null` props.
- Pass `folderName={selectedFolderId === null ? (folderNameMap[b.folderId ?? -1] ?? null) : null}` to each `BookmarkCard`.

## Drag UX

- Folder droppable targets highlight with existing `ring-1 ring-blue-400` when a bookmark is dragged over them.
- On drop onto a folder: PATCH `/api/bookmarks/{id}` + optimistic `setBookmarks` update.
- On drop onto "All Bookmarks" root: sets `folderId` to `null` (removes from folder).
- If dropped with no valid target: no-op.
- After a bookmark is moved, it disappears from the current folder-filtered view (correct behavior).

## Non-goals

- Drag reordering within a folder (no ordering concept in schema).
- Touch/mobile drag support (existing dnd-kit PointerSensor is fine).
