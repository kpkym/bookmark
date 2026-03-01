"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, onChange }: Props) {
  return (
    <input
      type="search"
      placeholder="Search bookmarks..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-md px-4 py-2 text-sm border rounded-lg dark:bg-gray-900 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
