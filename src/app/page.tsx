"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { BookmarkGrid } from "@/components/bookmark-grid";
import { SearchBar } from "@/components/search-bar";
import { Bookmark } from "@/types/bookmark";
import { BatchToolbar } from "@/components/batch-toolbar";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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

  function toggleBatchMode() {
    if (batchMode) {
      setSelectedIds(new Set());
    }
    setBatchMode(!batchMode);
  }

  function toggleSelection(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(bookmarks.map((b) => b.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function batchDelete() {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => fetch(`/api/bookmarks/${id}`, { method: "DELETE" })));
    setBookmarks((prev) => prev.filter((b) => !selectedIds.has(b.id)));
    setSelectedIds(new Set());
    setBatchMode(false);
  }

  async function batchMove(folderId: number | null) {
    const ids = Array.from(selectedIds);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/bookmarks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId }),
        })
      )
    );
    setBookmarks((prev) =>
      prev.map((b) => (selectedIds.has(b.id) ? { ...b, folderId } : b))
    );
    setSelectedIds(new Set());
    setBatchMode(false);
  }

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
        <header className="border-b border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
          <div className="flex-1">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          <button
            onClick={toggleBatchMode}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              batchMode
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {batchMode ? "Cancel" : "Select"}
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          <BookmarkGrid
            bookmarks={bookmarks}
            onDelete={handleDelete}
            batchMode={batchMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
          />
        </div>
      </main>
      {batchMode && (
        <BatchToolbar
          selectedCount={selectedIds.size}
          totalCount={bookmarks.length}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onDelete={batchDelete}
          onMove={batchMove}
          onCancel={toggleBatchMode}
        />
      )}
    </div>
  );
}
