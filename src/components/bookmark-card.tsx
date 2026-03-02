'use client'

import type { Bookmark } from '@/types/bookmark'
import { useEffect, useRef, useState } from 'react'

interface Props {
  bookmark: Bookmark
  onDelete: (id: number) => void
  batchMode: boolean
  selected: boolean
  onToggleSelect: (id: number) => void
}

export function BookmarkCard({ bookmark, onDelete, batchMode, selected, onToggleSelect }: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu)
      return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  return (
    <div
      onClick={batchMode ? () => onToggleSelect(bookmark.id) : undefined}
      className={`group relative rounded-lg border overflow-hidden transition-shadow cursor-pointer ${
        batchMode && selected
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : 'border-gray-200 dark:border-gray-800 hover:shadow-md'
      }`}
    >
      {batchMode && (
        <div className="absolute top-2 left-2 z-10">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
            selected
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-gray-400 bg-white/80'
          }`}
          >
            {selected && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}
      {batchMode
        ? (
            <div className="select-none pointer-events-none">
              {bookmark.screenshotPath
                ? (
                    <img
                      src={`/api/screenshots/${bookmark.screenshotPath}`}
                      alt={bookmark.title}
                      className="w-full h-40 object-cover object-top"
                      loading="lazy"
                    />
                  )
                : (
                    <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
                      No screenshot
                    </div>
                  )}
            </div>
          )
        : (
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
              {bookmark.screenshotPath
                ? (
                    <img
                      src={`/api/screenshots/${bookmark.screenshotPath}`}
                      alt={bookmark.title}
                      className="w-full h-40 object-cover object-top"
                      loading="lazy"
                    />
                  )
                : (
                    <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
                      No screenshot
                    </div>
                  )}
            </a>
          )}
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{bookmark.title}</h3>
        <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
        {bookmark.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
            {bookmark.description}
          </p>
        )}
      </div>
      {!batchMode && (
        <div ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/50 text-white rounded px-2 py-0.5 text-xs transition-opacity"
          >
            ...
          </button>
          {showMenu && (
            <div className="absolute top-8 right-2 bg-white dark:bg-gray-900 border rounded shadow-lg z-10">
              <button
                onClick={() => {
                  onDelete(bookmark.id)
                  setShowMenu(false)
                }}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
