import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const dbDir = path.join(process.cwd(), 'data')
fs.mkdirSync(dbDir, { recursive: true })

const sqlite = new Database(path.join(dbDir, 'bookmarks.db'))
sqlite.pragma('journal_mode = DELETE')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
