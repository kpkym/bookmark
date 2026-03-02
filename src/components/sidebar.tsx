'use client'

import type { Folder } from '@/lib/folder-utils'
import { useState } from 'react'
import { FolderTree } from './folder-tree'

interface Props {
  selectedFolderId: number | null
  onSelectFolder: (id: number | null) => void
  folders: Folder[]
  fetchFolders: () => void
}

export function Sidebar({ selectedFolderId, onSelectFolder, folders, fetchFolders }: Props) {
  const [newFolderName, setNewFolderName] = useState('')

  async function createFolder() {
    if (!newFolderName.trim())
      return
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() }),
    })
    setNewFolderName('')
    fetchFolders()
  }

  return (
    <aside className="w-60 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-4">
      <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
        Folders
      </h2>
      <FolderTree
        folders={folders}
        fetchFolders={fetchFolders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={onSelectFolder}
        onMutate={fetchFolders}
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
