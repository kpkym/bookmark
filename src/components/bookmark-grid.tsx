'use client'

import type { Bookmark } from '@/types/bookmark'
import { BookmarkCard } from './bookmark-card'

interface Props {
  bookmarks: Bookmark[]
  onDelete: (id: number) => void
  batchMode: boolean
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
  folderNameMap: Record<number, string>
}

export function BookmarkGrid({ bookmarks, onDelete, batchMode, selectedIds, onToggleSelect, folderNameMap }: Props) {
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
        <BookmarkCard
          key={b.id}
          bookmark={b}
          onDelete={onDelete}
          batchMode={batchMode}
          selected={selectedIds.has(b.id)}
          onToggleSelect={onToggleSelect}
          folderName={b.folderId != null ? (folderNameMap[b.folderId] ?? null) : null}
        />
      ))}
    </div>
  )
}
