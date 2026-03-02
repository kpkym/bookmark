'use client'

import { useEffect, useState } from 'react'
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface Folder {
  id: number
  name: string
  parentId: number | null
}

interface ContextMenu {
  x: number
  y: number
  folder: Folder
}

interface Props {
  selectedFolderId: number | null
  onSelectFolder: (id: number | null) => void
  refreshKey: number
  onMutate: () => void
}

function isDescendantOrSelf(folders: Folder[], ancestorId: number, checkId: number): boolean {
  if (ancestorId === checkId) return true
  const children = folders.filter(f => f.parentId === ancestorId)
  return children.some(c => isDescendantOrSelf(folders, c.id, checkId))
}

function DraggableFolder({
  folder,
  depth,
  isSelected,
  onSelect,
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
  children,
}: {
  folder: Folder
  depth: number
  isSelected: boolean
  onSelect: () => void
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
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: folder.id,
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${folder.id}`,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  function combinedRef(el: HTMLDivElement | null) {
    setDragRef(el)
    setDropRef(el)
  }

  return (
    <div
      ref={combinedRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''} ${isOver ? 'ring-1 ring-blue-400 rounded' : ''}`}
    >
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
              if (e.key === 'Escape') setEditingId(null)
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
            className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
              isSelected ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''
            }`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
          >
            {folder.name}
          </button>
        )}
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
            if (e.key === 'Escape') setCreatingUnder(null)
          }}
          onBlur={() => setCreatingUnder(null)}
          className="w-full px-3 py-1 text-sm rounded border border-blue-400 focus:outline-none dark:bg-gray-900"
          style={{ paddingLeft: `${(depth + 1) * 16 + 12}px` }}
        />
      )}
    </div>
  )
}

function AllBookmarksDropTarget({ isSelected, onSelect }: { isSelected: boolean, onSelect: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'root' })
  return (
    <div ref={setNodeRef} className={isOver ? 'ring-1 ring-blue-400 rounded' : ''}>
      <button
        onClick={onSelect}
        className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
          isSelected ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''
        }`}
      >
        All Bookmarks
      </button>
    </div>
  )
}

export function FolderTree({ selectedFolderId, onSelectFolder, refreshKey, onMutate: _onMutate }: Props) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [creatingUnder, setCreatingUnder] = useState<number | null>(null)
  const [creatingName, setCreatingName] = useState('')

  function fetchFolders() {
    fetch('/api/folders')
      .then(r => r.json())
      .then(setFolders)
  }

  useEffect(() => {
    fetchFolders()
  }, [refreshKey])

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

  async function handleDragEnd(event: DragEndEvent) {
    const draggedId = Number(event.active.id)
    const overId = event.over?.id

    if (!overId) return

    let newParentId: number | null

    if (overId === 'root') {
      newParentId = null
    }
    else {
      newParentId = Number(String(overId).replace('drop-', ''))
    }

    // No-op if dropped on self or descendant
    if (newParentId !== null && isDescendantOrSelf(folders, draggedId, newParentId)) return

    // No-op if already in that parent
    const dragged = folders.find(f => f.id === draggedId)
    if (dragged?.parentId === newParentId) return

    await fetch(`/api/folders/${draggedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: newParentId }),
    })
    fetchFolders()
  }

  const rootFolders = folders.filter(f => f.parentId === null)

  function renderFolder(folder: Folder, depth: number = 0) {
    const children = folders.filter(f => f.parentId === folder.id)
    const isSelected = selectedFolderId === folder.id

    return (
      <DraggableFolder
        key={folder.id}
        folder={folder}
        depth={depth}
        isSelected={isSelected}
        onSelect={() => onSelectFolder(folder.id)}
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
      >
        {children.map(c => renderFolder(c, depth + 1))}
      </DraggableFolder>
    )
  }

  return (
    <>
      <DndContext onDragEnd={handleDragEnd}>
        <nav className="space-y-0.5">
          <AllBookmarksDropTarget
            isSelected={selectedFolderId === null}
            onSelect={() => onSelectFolder(null)}
          />
          {rootFolders.map(f => renderFolder(f))}
        </nav>
      </DndContext>
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
              if (!window.confirm(`Delete "${folder.name}"? Bookmarks and subfolders will move to root.`))
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
