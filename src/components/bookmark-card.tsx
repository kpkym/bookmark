'use client'

import type { Bookmark } from '@/types/bookmark'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  bookmark: Bookmark
  onDelete: (id: number) => void
  batchMode: boolean
  selected: boolean
  onToggleSelect: (id: number) => void
  folderName: string | null
}

function formatDate(date: string) {
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`
}

function DetailModal({ bookmark, folderName, onClose }: { bookmark: Bookmark, folderName: string | null, onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 cursor-default"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget)
          onClose()
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-7xl w-full mx-4 overflow-hidden select-text cursor-auto">
        {bookmark.screenshotPath && (
          <img
            src={`/api/screenshots/${bookmark.screenshotPath}`}
            alt={bookmark.title}
            className="w-full max-h-[44rem] object-cover object-top"
          />
        )}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold leading-snug">{bookmark.title}</h2>
            <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 break-all">{bookmark.url}</p>
          {bookmark.description && <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{bookmark.description}</p>}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
            {folderName && (
              <span>
                Folder:
                <span className="text-gray-600 dark:text-gray-300">{folderName}</span>
              </span>
            )}
            <span>
              Created:
              <span className="text-gray-600 dark:text-gray-300">{formatDate(bookmark.createdAt)}</span>
            </span>
            <span>
              Updated:
              <span className="text-gray-600 dark:text-gray-300">{formatDate(bookmark.updatedAt)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BookmarkCard({ bookmark, onDelete, batchMode, selected, onToggleSelect, folderName }: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bookmark-${bookmark.id}`,
    data: { type: 'bookmark', bookmarkId: bookmark.id },
    disabled: showDetail,
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

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
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={batchMode ? () => onToggleSelect(bookmark.id) : undefined}
      className={`group relative rounded-lg border overflow-hidden transition-shadow cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      } ${
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
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              draggable={false}
            >
              {bookmark.screenshotPath
                ? (
                    <img
                      src={`/api/screenshots/${bookmark.screenshotPath}`}
                      alt={bookmark.title}
                      className="w-full h-40 object-cover object-top"
                      loading="lazy"
                      draggable={false}
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
        <div className="flex justify-between items-center mt-0.5 text-xs text-gray-400">
          <span className="truncate">{folderName ? `📁${folderName}` : ''}</span>
          <span className="shrink-0 ml-2">{formatDate(bookmark.updatedAt)}</span>
        </div>
        {bookmark.description && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{bookmark.description}</p>
        )}
      </div>
      {!batchMode && (
        <div ref={menuRef} onPointerDown={e => e.stopPropagation()}>
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
                  setShowDetail(true)
                  setShowMenu(false)
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Details
              </button>
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
      {showDetail && createPortal(
        <DetailModal
          bookmark={bookmark}
          folderName={folderName}
          onClose={() => setShowDetail(false)}
        />,
        document.body,
      )}
    </div>
  )
}
