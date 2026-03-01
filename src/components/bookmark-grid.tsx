"use client";

import { useEffect, useState } from "react";
import { BookmarkCard } from "./bookmark-card";
import { Bookmark } from "@/types/bookmark";

type Props = {
  searchQuery: string;
  folderId: number | null;
};

export function BookmarkGrid({ searchQuery, folderId }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (folderId !== null) params.set("folderId", String(folderId));

    fetch(`/api/bookmarks?${params}`)
      .then((r) => r.json())
      .then(setBookmarks);
  }, [searchQuery, folderId]);

  async function handleDelete(id: number) {
    await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No bookmarks yet. Use the Chrome extension to save some!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {bookmarks.map((b) => (
        <BookmarkCard key={b.id} bookmark={b} onDelete={handleDelete} />
      ))}
    </div>
  );
}
