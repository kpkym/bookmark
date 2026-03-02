# Folder Manipulation Design

**Date:** 2026-03-02
**Status:** Approved

## Summary

Add full folder manipulation to the sidebar UI: rename, delete, create subfolder, and drag-to-reparent. The API already supports all operations; this is purely a UI layer addition.

## User Interactions

### Trigger: Right-click context menu

Right-clicking any folder row opens a floating context menu at cursor position with:

- **Rename** — folder name becomes an inline `<input>`. Enter saves via PATCH, Escape cancels.
- **New Subfolder** — an inline `<input>` appears as a child of the clicked folder. Enter creates via POST, Escape cancels.
- **Delete** — `window.confirm()` confirmation → DELETE. API already moves bookmarks/child folders to root.

Context menu closes on outside click or Escape.

### Trigger: Drag and drop (Move/Reparent)

- Each folder row is both draggable and a drop target.
- "All Bookmarks" is also a drop target (sets parentId → null / moves to root).
- Visual feedback: highlighted border on the current drop target during drag.
- On drop → PATCH `/api/folders/[id]` with `{ parentId }`.
- Guard: prevent dropping a folder onto itself or any of its descendants.

## Architecture

### New dependency

`@dnd-kit/core` only (not @dnd-kit/sortable — we reparent, not sort).

### Files changed

| File | Change |
|------|--------|
| `src/components/folder-tree.tsx` | Major rewrite — add DndContext, draggable/droppable per row, context menu state, inline edit/create state |
| `src/components/sidebar.tsx` | Replace `window.location.reload()` with a `refreshFolders` callback prop; keep the root-level "New folder" input |

### State management

- `FolderTree` owns local state: `folders[]`, `contextMenu` (position + target folder), `editingId` (inline rename), `creatingUnder` (inline subfolder creation)
- `refreshFolders()` re-fetches `/api/folders` to update the tree without a full page reload
- Sidebar passes `onFoldersChange` callback down to FolderTree

## API calls (all pre-existing)

| Operation | Method | Endpoint | Body |
|-----------|--------|----------|------|
| Rename | PATCH | `/api/folders/[id]` | `{ name }` |
| Delete | DELETE | `/api/folders/[id]` | — |
| Create subfolder | POST | `/api/folders` | `{ name, parentId }` |
| Move | PATCH | `/api/folders/[id]` | `{ parentId }` |

## Guard: cycle prevention

Before executing a move, traverse upward from the proposed new parent. If the dragged folder's id appears in the ancestor chain, reject the move (no-op).

## Out of scope

- Multi-select folder delete
- Undo/redo
- Keyboard navigation of context menu
- Mobile/touch drag support
