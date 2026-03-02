import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { bookmarks, folders } from '@/db/schema'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json()
  const { name, parentId } = body

  const updates: Record<string, string | number | null> = {}
  if (name !== undefined)
    updates.name = name.trim()
  if (parentId !== undefined)
    updates.parentId = parentId

  if (Object.keys(updates).length === 0) {
    return new Response('nothing to update', { status: 400 })
  }

  const [updated] = await db
    .update(folders)
    .set(updates)
    .where(eq(folders.id, Number(id)))
    .returning()

  if (!updated) {
    return new Response('folder not found', { status: 404 })
  }

  return Response.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const folderId = Number(id)

  const [folder] = await db.select().from(folders).where(eq(folders.id, folderId))
  if (!folder)
    return new Response('folder not found', { status: 404 })

  // Delete bookmarks in this folder
  await db
    .delete(bookmarks)
    .where(eq(bookmarks.folderId, folderId))

  // Move child folders to this folder's parent
  await db
    .update(folders)
    .set({ parentId: folder.parentId })
    .where(eq(folders.parentId, folderId))

  await db.delete(folders).where(eq(folders.id, folderId))

  return new Response(null, { status: 204 })
}
