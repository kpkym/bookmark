import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

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
  const filename = `${id}.webp`
  const filepath = path.join(SCREENSHOTS_DIR, filename)
  await sharp(buffer)
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filepath)
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
