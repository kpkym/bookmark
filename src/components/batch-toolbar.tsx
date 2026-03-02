'use client'

import { useState } from 'react'

interface Folder {
  id: number
  name: string
  parentId: number | null
}

interface Props {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onDelete: () => void
  onMove: (folderId: number | null) => void
  onCancel: () => void
}

export function BatchToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onMove,
  onCancel,
}: Props) {
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])

  const allSelected = selectedCount === totalCount && totalCount > 0

  function handleToggleAll() {
    if (allSelected)
      onDeselectAll()
    else onSelectAll()
  }

  async function openFolderPicker() {
    const res = await fetch('/api/folders')
    const data = await res.json()
    setFolders(data)
    setShowFolderPicker(true)
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 z-50">
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedCount}
        {' '}
        selected
      </span>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      <button
        onClick={handleToggleAll}
        className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 whitespace-nowrap"
      >
        {allSelected ? 'Deselect all' : 'Select all'}
      </button>

      <div className="relative">
        <button
          onClick={openFolderPicker}
          disabled={selectedCount === 0}
          className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          Move
        </button>
        {showFolderPicker && (
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-900 border rounded-lg shadow-xl z-50 min-w-48 max-h-60 overflow-y-auto">
            <button
              onClick={() => {
                onMove(null)
                setShowFolderPicker(false)
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              No folder (root)
            </button>
            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => {
                  onMove(f.id)
                  setShowFolderPicker(false)
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {showDeleteConfirm
        ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">
                Delete
                {selectedCount}
                ?
              </span>
              <button
                onClick={() => {
                  onDelete()
                  setShowDeleteConfirm(false)
                }}
                className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                No
              </button>
            </div>
          )
        : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Delete
            </button>
          )}

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      <button
        onClick={onCancel}
        className="px-2 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
