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
  const main = sorted.filter(([, count]) => count >= 3)
  const others = sorted.filter(([, count]) => count < 3)
  const othersTotal = others.reduce((sum, [, count]) => sum + count, 0)

  return (
    <div className="flex-1 flex flex-col gap-0.5 min-h-0 overflow-hidden">
      <button
        onClick={() => onSelectDomain(null)}
        className={`shrink-0 text-left px-2 py-1.5 rounded text-sm truncate ${
          selectedDomain === null
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        All Domains
      </button>
      <div className="flex flex-col gap-0.5 overflow-y-auto min-h-0 flex-1">
        {main.map(([domain, count]) => (
          <button
            key={domain}
            onClick={() => onSelectDomain(selectedDomain === domain ? null : domain)}
            className={`text-left px-2 py-1.5 rounded text-sm truncate flex justify-between items-center gap-2 ${
              selectedDomain === domain
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span className="truncate min-w-0">{domain}</span>
            <span className="shrink-0 text-xs text-gray-400">{count}</span>
          </button>
        ))}
        {others.length > 0 && (
          <button
            onClick={() => onSelectDomain(selectedDomain === '__others__' ? null : '__others__')}
            className={`text-left px-2 py-1.5 rounded text-sm truncate flex justify-between items-center gap-2 ${
              selectedDomain === '__others__'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span className="truncate min-w-0 text-gray-500 dark:text-gray-400">[others]</span>
            <span className="shrink-0 text-xs text-gray-400">{othersTotal}</span>
          </button>
        )}
      </div>
    </div>
  )
}
