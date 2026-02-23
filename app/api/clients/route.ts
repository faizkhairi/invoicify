import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createClientSchema } from "@/lib/validations"

// GET /api/clients — list active clients
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("q")

  const clients = await db.client.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(clients)
}

// POST /api/clients — create a new client
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 },
    )
  }

  const client = await db.client.create({
    data: { ...parsed.data, userId: session.user.id },
  })

  return NextResponse.json(client, { status: 201 })
}
