"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { BookmarkGrid } from "@/components/bookmark-grid";
import { SearchBar } from "@/components/search-bar";
import { Bookmark } from "@/types/bookmark";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const fetchBookmarks = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedFolderId !== null) params.set("folderId", String(selectedFolderId));

    fetch(`/api/bookmarks?${params}`)
      .then((r) => r.json())
      .then(setBookmarks);
  }, [searchQuery, selectedFolderId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  function handleDelete(id: number) {
    fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-gray-200 dark:border-gray-800 p-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </header>
        <div className="flex-1 overflow-y-auto">
          <BookmarkGrid
            bookmarks={bookmarks}
            onDelete={handleDelete}
          />
        </div>
      </main>
    </div>
  );
}
