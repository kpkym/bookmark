'use client'

import { useState } from 'react'
import { FolderTree } from './folder-tree'

interface Props {
  selectedFolderId: number | null
  onSelectFolder: (id: number | null) => void
}

export function Sidebar({ selectedFolderId, onSelectFolder }: Props) {
  const [newFolderName, setNewFolderName] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  function refresh() {
    setRefreshKey(k => k + 1)
  }

  async function createFolder() {
    if (!newFolderName.trim())
      return
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() }),
    })
    setNewFolderName('')
    refresh()
  }

  return (
    <aside className="w-60 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-4">
      <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
        Folders
      </h2>
      <FolderTree
        selectedFolderId={selectedFolderId}
        onSelectFolder={onSelectFolder}
        refreshKey={refreshKey}
        onMutate={refresh}
      />
      <div className="mt-auto">
        <input
          type="text"
          placeholder="New folder..."
          value={newFolderName}
          onChange={e => setNewFolderName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createFolder()}
          className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-900 dark:border-gray-700"
        />
      </div>
    </aside>
  )
}
