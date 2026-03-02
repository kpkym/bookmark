import fs from 'node:fs'
import path from 'node:path'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'data', 'screenshots')

export function ensureScreenshotDir() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

export async function saveScreenshot(
  id: number,
  file: File,
): Promise<string> {
  ensureScreenshotDir()
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.type === 'image/webp' ? 'webp' : 'png'
  const filename = `${id}.${ext}`
  const filepath = path.join(SCREENSHOTS_DIR, filename)
  fs.writeFileSync(filepath, buffer)
  return filename
}

export function deleteScreenshot(filename: string) {
  const filepath = path.join(SCREENSHOTS_DIR, filename)
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath)
  }
}

export function getScreenshotPath(filename: string): string {
  return path.join(SCREENSHOTS_DIR, filename)
}
