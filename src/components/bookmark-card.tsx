"use client";

import { useState } from "react";

type Bookmark = {
  id: number;
  url: string;
  title: string;
  description: string | null;
  screenshotPath: string | null;
  folderId: number | null;
  createdAt: string;
};

type Props = {
  bookmark: Bookmark;
  onDelete: (id: number) => void;
};

export function BookmarkCard({ bookmark, onDelete }: Props) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group relative rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
      <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
        {bookmark.screenshotPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/screenshots/${bookmark.screenshotPath}`}
            alt={bookmark.title}
            className="w-full h-40 object-cover object-top"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
            No screenshot
          </div>
        )}
      </a>
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{bookmark.title}</h3>
        <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
        {bookmark.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
            {bookmark.description}
          </p>
        )}
      </div>
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
              onDelete(bookmark.id);
              setShowMenu(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
