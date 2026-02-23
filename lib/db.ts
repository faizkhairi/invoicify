import { PrismaClient } from "@/app/generated/prisma"
import { PrismaNeon } from "@prisma/adapter-neon"

function createPrismaClient() {
  // PrismaNeon({ connectionString }) creates a WebSocket Pool that supports
  // interactive transactions (db.$transaction with async callback).
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { db: PrismaClient }
export const db = globalForPrisma.db ?? createPrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.db = db
