import { and, desc, eq, like, or } from 'drizzle-orm'
import { db } from '@/db'
import { bookmarks } from '@/db/schema'
import { deleteScreenshot, saveScreenshot } from '@/lib/screenshots'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const folderId = searchParams.get('folderId')

  const conditions = []

  if (query) {
    const pattern = `%${query}%`
    conditions.push(
      or(
        like(bookmarks.title, pattern),
        like(bookmarks.url, pattern),
        like(bookmarks.description, pattern),
      )!,
    )
  }

  if (folderId) {
    conditions.push(eq(bookmarks.folderId, Number(folderId)))
  }

  const results = await db
    .select()
    .from(bookmarks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bookmarks.createdAt))

  return Response.json(results)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const url = formData.get('url') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string | null
  const folderId = formData.get('folderId') as string | null
  const screenshot = formData.get('screenshot') as File | null

  if (!url || !title) {
    return new Response('url and title are required', { status: 400 })
  }

  let bookmark: typeof bookmarks.$inferSelect
  try {
    ;[bookmark] = await db
      .insert(bookmarks)
      .values({
        url,
        title: title.trim(),
        description: description?.trim() || null,
        folderId: folderId ? Number(folderId) : null,
      })
      .returning()
  }
  catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      const [existing] = await db.select().from(bookmarks).where(eq(bookmarks.url, url))
      if (existing?.screenshotPath) {
        deleteScreenshot(existing.screenshotPath)
      }
      await db.delete(bookmarks).where(eq(bookmarks.url, url))
      ;[bookmark] = await db
        .insert(bookmarks)
        .values({
          url,
          title: title.trim(),
          description: description?.trim() || null,
          folderId: folderId ? Number(folderId) : null,
        })
        .returning()
    }
    else {
      throw e
    }
  }

  if (screenshot && screenshot.size > 0) {
    const filename = await saveScreenshot(bookmark.id, screenshot)
    await db
      .update(bookmarks)
      .set({ screenshotPath: filename })
      .where(eq(bookmarks.id, bookmark.id))
    bookmark.screenshotPath = filename
  }

  return Response.json(bookmark, { status: 201 })
}
