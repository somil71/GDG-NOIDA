import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'
import path from 'path'

// Force DATABASE_URL for tests if undefined
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

// RED TEAM FIX: Enable WAL mode for high concurrency
const sqlite = new Database(path.resolve(process.cwd(), process.env.DATABASE_URL.replace('file:', '')))
sqlite.pragma('journal_mode = WAL');

const adapter = new (PrismaBetterSqlite3 as any)({
  url: process.env.DATABASE_URL
})

export const prisma = new PrismaClient({ adapter })
