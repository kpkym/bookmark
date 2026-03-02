export interface Folder {
  id: number
  name: string
  parentId: number | null
}

export function isDescendantOrSelf(folders: Folder[], ancestorId: number, checkId: number): boolean {
  if (ancestorId === checkId)
    return true
  const children = folders.filter(f => f.parentId === ancestorId)
  return children.some(c => isDescendantOrSelf(folders, c.id, checkId))
}
