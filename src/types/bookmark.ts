export interface Bookmark {
  id: number
  url: string
  title: string
  description: string | null
  screenshotPath: string | null
  folderId: number | null
  createdAt: string
  updatedAt: string
}
