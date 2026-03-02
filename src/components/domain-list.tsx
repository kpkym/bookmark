'use client'

interface Props {
  bookmarks: { url: string }[]
  selectedDomain: string | null
  onSelectDomain: (domain: string | null) => void
}

export function DomainList({ bookmarks, selectedDomain, onSelectDomain }: Props) {
  const domainCounts = new Map<string, number>()
  for (const b of bookmarks) {
    try {
      const domain = new URL(b.url).hostname
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1)
    }
    catch {
      // skip invalid URLs
    }
  }

  const sorted = [...domainCounts.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto">
      <button
        onClick={() => onSelectDomain(null)}
        className={`text-left px-2 py-1 rounded text-sm truncate ${
          selectedDomain === null
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        All Domains
      </button>
      {sorted.map(([domain, count]) => (
        <button
          key={domain}
          onClick={() => onSelectDomain(selectedDomain === domain ? null : domain)}
          className={`text-left px-2 py-1 rounded text-sm truncate flex justify-between items-center gap-2 ${
            selectedDomain === domain
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <span className="truncate">{domain}</span>
          <span className="shrink-0 text-xs text-gray-400">{count}</span>
        </button>
      ))}
    </div>
  )
}
