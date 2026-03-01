"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { BookmarkGrid } from "@/components/bookmark-grid";
import { SearchBar } from "@/components/search-bar";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

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
          <BookmarkGrid searchQuery={searchQuery} folderId={selectedFolderId} />
        </div>
      </main>
    </div>
  );
}
