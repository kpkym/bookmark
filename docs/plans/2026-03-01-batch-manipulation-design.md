# Batch Manipulation Design

## Summary

Add batch select, delete, and move-to-folder operations for bookmarks.

## UX Flow

1. **Toggle button** ("Select") in the header next to the search bar enters batch mode
2. **In batch mode**: each card shows a checkbox overlay (top-left). Clicking a card toggles selection instead of navigating. A floating action toolbar appears at the bottom.
3. **Toolbar actions**: select all/deselect all, "Move to folder" (folder picker dropdown), "Delete" (with confirmation), cancel
4. **Exit**: cancel button or toggle button clears selection and exits batch mode

## State Changes

- Lift `bookmarks[]` from `BookmarkGrid` to `page.tsx`
- New state in `page.tsx`: `batchMode: boolean`, `selectedIds: Set<number>`
- `BookmarkCard` new props: `batchMode`, `selected`, `onToggleSelect`

## API Approach

- Reuse existing `DELETE /api/bookmarks/{id}` and `PATCH /api/bookmarks/{id}` endpoints
- Fire requests in parallel via `Promise.all`, update local state in one pass
- No backend changes required

## UI Layout

```
┌─────────────────────────────────────────┐
│ Sidebar │  [Search...]        [Select]  │
│         │                               │
│ Folders │  ┌─────┐ ┌─────┐ ┌─────┐     │
│         │  │☑ card│ │☐ card│ │☑ card│    │
│         │  └─────┘ └─────┘ └─────┘     │
│         │                               │
│         │  ┌──────────────────────────┐  │
│         │  │ 2 selected  [All] [Move] │  │
│         │  │            [Delete] [✕]  │  │
│         │  └──────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Components Affected

- `page.tsx` — owns batch state, lifts bookmarks state up
- `bookmark-grid.tsx` — receives bookmarks as prop instead of fetching internally
- `bookmark-card.tsx` — checkbox overlay, selection behavior
- New: `batch-toolbar.tsx` — floating bottom toolbar with actions
