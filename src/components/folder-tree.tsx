'use client'

import { useEffect, useState } from 'react'

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

export function FolderTree({ selectedFolderId, onSelectFolder, refreshKey, onMutate: _onMutate }: Props) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)

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
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      setContextMenu(null)
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', close)
    }
  }, [])

  const rootFolders = folders.filter(f => f.parentId === null)

  function renderFolder(folder: Folder, depth: number = 0) {
    const children = folders.filter(f => f.parentId === folder.id)
    const isSelected = selectedFolderId === folder.id

    return (
      <div key={folder.id}>
        <button
          onClick={() => onSelectFolder(folder.id)}
          onContextMenu={(e) => {
            e.preventDefault()
            setContextMenu({ x: e.clientX, y: e.clientY, folder })
          }}
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
    <>
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
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1 min-w-36"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => {
              // rename — Task 4
              setContextMenu(null)
            }}
          >
            Rename
          </button>
          <button
            className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => {
              // new subfolder — Task 6
              setContextMenu(null)
            }}
          >
            New Subfolder
          </button>
          <button
            className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600 dark:text-red-400"
            onClick={() => {
              // delete — Task 5
              setContextMenu(null)
            }}
          >
            Delete
          </button>
        </div>
      )}
    </>
  )
}
