import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteScreenshot } from "@/lib/screenshots";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title, description, folderId } = body;

  const updates: Record<string, string | number | Date | null> = {
    updatedAt: new Date(),
  };
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (folderId !== undefined) updates.folderId = folderId;

  const [updated] = await db
    .update(bookmarks)
    .set(updates)
    .where(eq(bookmarks.id, Number(id)))
    .returning();

  if (!updated) {
    return new Response("bookmark not found", { status: 404 });
  }

  return Response.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [bookmark] = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.id, Number(id)));

  if (!bookmark) {
    return new Response("bookmark not found", { status: 404 });
  }

  if (bookmark.screenshotPath) {
    deleteScreenshot(bookmark.screenshotPath);
  }

  await db.delete(bookmarks).where(eq(bookmarks.id, Number(id)));
  return new Response(null, { status: 204 });
}
