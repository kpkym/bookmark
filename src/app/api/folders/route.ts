import { db } from '@/db'
import { folders } from '@/db/schema'

export async function GET() {
  const allFolders = await db.select().from(folders)
  return Response.json(allFolders)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, parentId } = body

  if (!name || typeof name !== 'string') {
    return new Response('name is required', { status: 400 })
  }

  const [folder] = await db
    .insert(folders)
    .values({
      name: name.trim(),
      parentId: parentId ?? null,
    })
    .returning()

  return Response.json(folder, { status: 201 })
}
