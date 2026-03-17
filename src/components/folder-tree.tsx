'use client'

import type { Folder } from '@/lib/folder-utils'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useState } from 'react'
import { getDescendantIds } from '@/lib/folder-utils'

export type { Folder }

interface ContextMenu {
  x: number
  y: number
  folder: Folder
}

interface Props {
  folders: Folder[]
  fetchFolders: () => void
  selectedFolderId: number | null
  onSelectFolder: (id: number | null) => void
  onMutate: () => void
  bookmarks: { folderId: number | null }[]
}

function DraggableFolder({
  folder,
  depth,
  isSelected,
  hasChildren,
  isExpanded,
  onSelect,
  onToggleExpand,
  onContextMenu,
  editingId,
  editingName,
  setEditingName,
  setEditingId,
  fetchFolders,
  creatingUnder,
  creatingName,
  setCreatingName,
  setCreatingUnder,
  bookmarkCount,
  children,
}: {
  folder: Folder
  depth: number
  isSelected: boolean
  hasChildren: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleExpand: () => void
  onContextMenu: (e: React.MouseEvent) => void
  editingId: number | null
  editingName: string
  setEditingName: (v: string) => void
  setEditingId: (id: number | null) => void
  fetchFolders: () => void
  creatingUnder: number | null
  creatingName: string
  setCreatingName: (v: string) => void
  setCreatingUnder: (id: number | null) => void
  bookmarkCount: number
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: folder.id,
    data: { type: 'folder' },
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${folder.id}`,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setDragRef}
      style={style}
      className={isDragging ? 'opacity-50' : ''}
    >
      <div ref={setDropRef} className={isOver ? 'ring-1 ring-blue-400 rounded' : ''}>
        {editingId === folder.id
          ? (
              <input
                autoFocus
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    await fetch(`/api/folders/${folder.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: editingName.trim() }),
                    })
                    setEditingId(null)
                    fetchFolders()
                  }
                  if (e.key === 'Escape')
                    setEditingId(null)
                }}
                onBlur={() => setEditingId(null)}
                className="w-full px-3 py-1 text-sm rounded border border-blue-400 focus:outline-none dark:bg-gray-900"
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
              />
            )
          : (
              <button
                {...attributes}
                {...listeners}
                onClick={onSelect}
                onContextMenu={onContextMenu}
                className={`w-full text-left py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 pr-3 ${
                  isSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium' : ''
                }`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
              >
                <span
                  className={`flex-shrink-0 flex items-center justify-center w-4 h-4 text-gray-400 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''} ${!hasChildren ? 'invisible' : ''}`}
                  onClick={hasChildren
                    ? (e) => {
                        e.stopPropagation()
                        onToggleExpand()
                      }
                    : undefined}
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <span className="truncate min-w-0">{folder.name}</span>
                <span className="ml-auto shrink-0 text-xs text-gray-400">{bookmarkCount}</span>
              </button>
            )}
      </div>
      {children}
      {creatingUnder === folder.id && (
        <input
          autoFocus
          placeholder="Subfolder name..."
          value={creatingName}
          onChange={e => setCreatingName(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && creatingName.trim()) {
              await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: creatingName.trim(), parentId: folder.id }),
              })
              setCreatingUnder(null)
              fetchFolders()
            }
            if (e.key === 'Escape')
              setCreatingUnder(null)
          }}
          onBlur={() => setCreatingUnder(null)}
          className="w-full px-3 py-1 text-sm rounded border border-blue-400 focus:outline-none dark:bg-gray-900"
          style={{ paddingLeft: `${(depth + 1) * 16 + 12}px` }}
        />
      )}
    </div>
  )
}

function AllBookmarksDropTarget({ isSelected, onSelect, bookmarkCount }: { isSelected: boolean, onSelect: () => void, bookmarkCount: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'root' })
  return (
    <div ref={setNodeRef} className={isOver ? 'ring-1 ring-blue-400 rounded' : ''}>
      <button
        onClick={onSelect}
        className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex justify-between items-center gap-2 ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium' : ''
        }`}
      >
        <span className="truncate min-w-0">All Bookmarks</span>
        <span className="shrink-0 text-xs text-gray-400">{bookmarkCount}</span>
      </button>
    </div>
  )
}

export function FolderTree({ folders, fetchFolders, selectedFolderId, onSelectFolder, onMutate: _onMutate, bookmarks }: Props) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [creatingUnder, setCreatingUnder] = useState<number | null>(null)
  const [creatingName, setCreatingName] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id))
        next.delete(id)
      else
        next.add(id)
      return next
    })
  }

  useEffect(() => {
    function close(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key !== 'Escape')
        return
      setContextMenu(null)
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', close)
    }
  }, [])

  const folderCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const b of bookmarks) {
      if (b.folderId !== null) {
        counts.set(b.folderId, (counts.get(b.folderId) ?? 0) + 1)
      }
    }
    // Sum descendants for each folder
    const totalCounts = new Map<number, number>()
    for (const folder of folders) {
      const ids = getDescendantIds(folders, folder.id)
      totalCounts.set(folder.id, ids.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0))
    }
    return totalCounts
  }, [bookmarks, folders])

  const rootFolders = folders.filter(f => f.parentId === null)

  function renderFolder(folder: Folder, depth: number = 0) {
    const children = folders.filter(f => f.parentId === folder.id)
    const isSelected = selectedFolderId === folder.id
    const hasChildren = children.length > 0
    const isExpanded = expandedIds.has(folder.id)

    return (
      <DraggableFolder
        key={folder.id}
        folder={folder}
        depth={depth}
        isSelected={isSelected}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onSelect={() => {
          if (!isSelected)
            setExpandedIds(prev => new Set(prev).add(folder.id))
          onSelectFolder(isSelected ? null : folder.id)
        }}
        onToggleExpand={() => toggleExpand(folder.id)}
        onContextMenu={(e) => {
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY, folder })
        }}
        editingId={editingId}
        editingName={editingName}
        setEditingName={setEditingName}
        setEditingId={setEditingId}
        fetchFolders={fetchFolders}
        creatingUnder={creatingUnder}
        creatingName={creatingName}
        setCreatingName={setCreatingName}
        setCreatingUnder={setCreatingUnder}
        bookmarkCount={folderCounts.get(folder.id) ?? 0}
      >
        {isExpanded && children.map(c => renderFolder(c, depth + 1))}
      </DraggableFolder>
    )
  }

  return (
    <>
      <nav className="space-y-0.5">
        <AllBookmarksDropTarget
          isSelected={selectedFolderId === null}
          onSelect={() => onSelectFolder(null)}
          bookmarkCount={bookmarks.length}
        />
        {rootFolders.map(f => renderFolder(f))}
      </nav>
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1 min-w-36"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => {
              setEditingId(contextMenu.folder.id)
              setEditingName(contextMenu.folder.name)
              setContextMenu(null)
            }}
          >
            Rename
          </button>
          <button
            className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => {
              setCreatingUnder(contextMenu.folder.id)
              setCreatingName('')
              setContextMenu(null)
            }}
          >
            New Subfolder
          </button>
          <button
            className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600 dark:text-red-400"
            onClick={async () => {
              const folder = contextMenu.folder
              setContextMenu(null)
              const res = await fetch(`/api/bookmarks?folderIds=${folder.id}`)
              const bms = await res.json()
              const count = bms.length
              const parentFolder = folder.parentId != null ? folders.find(f => f.id === folder.parentId) : null
              const parentLabel = parentFolder ? `"${parentFolder.name}"` : 'root'
              const msg = count > 0
                ? `Delete "${folder.name}"? This will permanently delete ${count} bookmark${count > 1 ? 's' : ''} inside it. Subfolders will move to ${parentLabel}.`
                : `Delete "${folder.name}"? Subfolders will move to ${parentLabel}.`
              // eslint-disable-next-line no-alert
              if (!window.confirm(msg))
                return
              await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' })
              fetchFolders()
            }}
          >
            Delete
          </button>
        </div>
      )}
    </>
  )
}
