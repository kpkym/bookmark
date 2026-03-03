/**
 * Extract the base domain (last two parts) from a URL.
 * e.g., "https://www.google.com/path" → "google.com"
 */
export function extractDomain(url: string): string {
  const hostname = new URL(url).hostname
  const parts = hostname.split('.')
  return parts.slice(-2).join('.')
}
