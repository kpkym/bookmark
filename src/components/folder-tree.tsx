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
  refreshKey: number
  onMutate: () => void
}

export function FolderTree({ selectedFolderId, onSelectFolder, refreshKey, onMutate: _onMutate }: Props) {
  const [folders, setFolders] = useState<Folder[]>([])

  function fetchFolders() {
    fetch('/api/folders')
      .then(r => r.json())
      .then(setFolders)
  }

  useEffect(() => {
    fetchFolders()
  }, [refreshKey])

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
