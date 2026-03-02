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

export function getDescendantIds(folders: Folder[], folderId: number): number[] {
  const ids = [folderId]
  const children = folders.filter(f => f.parentId === folderId)
  for (const child of children) {
    ids.push(...getDescendantIds(folders, child.id))
  }
  return ids
}
