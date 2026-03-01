import { getScreenshotPath } from "@/lib/screenshots";
import fs from "fs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const filepath = getScreenshotPath(filename);

  if (!fs.existsSync(filepath)) {
    return new Response("not found", { status: 404 });
  }

  const buffer = fs.readFileSync(filepath);
  const contentType = filename.endsWith(".webp")
    ? "image/webp"
    : "image/png";

  return new Response(buffer, {
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
  });
}
