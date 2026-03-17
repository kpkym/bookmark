'use client'

import type { Folder } from '@/lib/folder-utils'
import { useState } from 'react'
import { DomainList } from './domain-list'
import { FolderTree } from './folder-tree'

interface Props {
  sidebarMode: 'folders' | 'domains'
  onSetSidebarMode: (mode: 'folders' | 'domains') => void
  selectedFolderId: number | null
  onSelectFolder: (id: number | null) => void
  folders: Folder[]
  fetchFolders: () => void
  bookmarks: { url: string, folderId: number | null }[]
  allBookmarks: { url: string, folderId: number | null }[]
  selectedDomain: string | null
  onSelectDomain: (domain: string | null) => void
}

export function Sidebar({
  sidebarMode,
  onSetSidebarMode,
  selectedFolderId,
  onSelectFolder,
  folders,
  fetchFolders,
  bookmarks,
  allBookmarks,
  selectedDomain,
  onSelectDomain,
}: Props) {
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
    <aside className="w-60 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-4 overflow-hidden">
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => onSetSidebarMode('domains')}
          className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
            sidebarMode === 'domains'
              ? 'bg-blue-600 text-white'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Domains
        </button>
        <button
          onClick={() => onSetSidebarMode('folders')}
          className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
            sidebarMode === 'folders'
              ? 'bg-blue-600 text-white'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Folders
        </button>
      </div>
      {sidebarMode === 'folders'
        ? (
            <>
              <FolderTree
                folders={folders}
                fetchFolders={fetchFolders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={onSelectFolder}
                onMutate={fetchFolders}
                bookmarks={allBookmarks}
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
            </>
          )
        : (
            <DomainList
              bookmarks={bookmarks}
              selectedDomain={selectedDomain}
              onSelectDomain={onSelectDomain}
            />
          )}
    </aside>
  )
}
