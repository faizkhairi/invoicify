import { defineConfig, env } from "prisma/config"

// Prisma 7.4.1: datasource URL goes here (not in schema.prisma).
// The driver adapter (PrismaNeon) is wired in lib/db.ts for runtime.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
})
