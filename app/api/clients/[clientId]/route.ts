import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateClientSchema } from "@/lib/validations"

type Params = { params: Promise<{ clientId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { clientId } = await params
  const client = await db.client.findFirst({
    where: { id: clientId, userId: session.user.id, deletedAt: null },
    include: {
      invoices: {
        where: { status: { not: "VOID" } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, invoiceNumber: true, status: true, totalAmount: true, dueDate: true },
      },
    },
  })
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  return NextResponse.json(client)
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { clientId } = await params
  const existing = await db.client.findFirst({
    where: { id: clientId, userId: session.user.id, deletedAt: null },
  })
  if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const body = await req.json()
  const parsed = updateClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 },
    )
  }

  const client = await db.client.update({
    where: { id: clientId },
    data: parsed.data,
  })

  return NextResponse.json(client)
}

// Soft-delete: set deletedAt = now()
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { clientId } = await params
  const existing = await db.client.findFirst({
    where: { id: clientId, userId: session.user.id, deletedAt: null },
  })
  if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  await db.client.update({
    where: { id: clientId },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
