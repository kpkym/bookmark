'use client'

import type { DragEndEvent } from '@dnd-kit/core'
import type { Folder } from '@/lib/folder-utils'
import type { Bookmark } from '@/types/bookmark'
import { DndContext, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BatchToolbar } from '@/components/batch-toolbar'
import { BookmarkGrid } from '@/components/bookmark-grid'
import { SearchBar } from '@/components/search-bar'
import { Sidebar } from '@/components/sidebar'
import { getDescendantIds, isDescendantOrSelf } from '@/lib/folder-utils'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [sidebarMode, setSidebarMode] = useState<'folders' | 'domains'>('folders')
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)

  const fetchFolders = useCallback(() => {
    fetch('/api/folders').then(r => r.json()).then(setFolders)
  }, [])

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  const fetchBookmarks = useCallback(() => {
    const params = new URLSearchParams()
    if (searchQuery)
      params.set('q', searchQuery)
    if (selectedFolderId !== null) {
      const ids = getDescendantIds(folders, selectedFolderId)
      params.set('folderIds', ids.join(','))
    }

    fetch(`/api/bookmarks?${params}`)
      .then(r => r.json())
      .then(setBookmarks)
  }, [searchQuery, selectedFolderId, folders])

  useEffect(() => {
    fetchBookmarks()
  }, [fetchBookmarks])

  function handleSetSidebarMode(mode: 'folders' | 'domains') {
    setSidebarMode(mode)
    if (mode === 'folders') {
      setSelectedDomain(null)
    }
    else {
      setSelectedFolderId(null)
    }
  }

  const filteredBookmarks = useMemo(
    () => selectedDomain
      ? bookmarks.filter((b) => {
          try {
            return new URL(b.url).hostname === selectedDomain
          }
          catch {
            return false
          }
        })
      : bookmarks,
    [bookmarks, selectedDomain],
  )

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

  function selectAll() {
    setSelectedIds(new Set(filteredBookmarks.map(b => b.id)))
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
        }),
      ),
    )
    setBookmarks(prev =>
      prev.map(b => (selectedIds.has(b.id) ? { ...b, folderId } : b)),
    )
    setSelectedIds(new Set())
    setBatchMode(false)
  }

  function handleDelete(id: number) {
    fetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  const folderNameMap = useMemo(
    () => Object.fromEntries(folders.map(f => [f.id, f.name])),
    [folders],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const justDragged = useRef(false)

  async function handleDragEnd(event: DragEndEvent) {
    justDragged.current = true
    requestAnimationFrame(() => {
      justDragged.current = false
    })
    const { active, over } = event
    if (!over)
      return

    if (active.data.current?.type === 'bookmark') {
      const bookmarkId = active.data.current.bookmarkId as number
      let newFolderId: number | null
      if (over.id === 'root') {
        newFolderId = null
      }
      else {
        newFolderId = Number(String(over.id).replace('drop-', ''))
      }
      setBookmarks(prev =>
        prev.map(b => b.id === bookmarkId ? { ...b, folderId: newFolderId } : b),
      )
      await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: newFolderId }),
      })
      return
    }

    // Folder reparenting
    const draggedId = Number(active.id)
    let newParentId: number | null
    if (over.id === 'root') {
      newParentId = null
    }
    else {
      newParentId = Number(String(over.id).replace('drop-', ''))
    }
    if (newParentId !== null && isDescendantOrSelf(folders, draggedId, newParentId))
      return
    const dragged = folders.find(f => f.id === draggedId)
    if (dragged?.parentId === newParentId)
      return

    await fetch(`/api/folders/${draggedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: newParentId }),
    })
    fetchFolders()
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div
        className="flex h-screen"
        onClickCapture={(e) => {
          if (justDragged.current) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      >
        <Sidebar
          sidebarMode={sidebarMode}
          onSetSidebarMode={handleSetSidebarMode}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          folders={folders}
          fetchFolders={fetchFolders}
          bookmarks={bookmarks}
          selectedDomain={selectedDomain}
          onSelectDomain={setSelectedDomain}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
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
          <div className="flex-1 overflow-y-auto">
            <BookmarkGrid
              bookmarks={filteredBookmarks}
              onDelete={handleDelete}
              batchMode={batchMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
              folderNameMap={folderNameMap}
            />
          </div>
        </main>
        {batchMode && (
          <BatchToolbar
            selectedCount={selectedIds.size}
            totalCount={filteredBookmarks.length}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onDelete={batchDelete}
            onMove={batchMove}
            onCancel={toggleBatchMode}
          />
        )}
      </div>
    </DndContext>
  )
}
