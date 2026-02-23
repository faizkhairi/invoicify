import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createInvoiceSchema } from "@/lib/validations"
import { generateInvoiceNumber } from "@/lib/invoice-numbering"
import { calculateInvoiceTotals, calculateItemAmount } from "@/lib/currency"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const clientId = searchParams.get("clientId")

  const invoices = await db.invoice.findMany({
    where: {
      userId: session.user.id,
      status: { not: "VOID" },
      ...(status && { status: status as never }),
      ...(clientId && { clientId }),
    },
    include: {
      client: { select: { id: true, name: true, company: true } },
      _count: { select: { payments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  // Derive OVERDUE status on read rather than storing it
  const now = new Date()
  const enriched = invoices.map((inv) => ({
    ...inv,
    isOverdue:
      (inv.status === "SENT" || inv.status === "PARTIAL") &&
      new Date(inv.dueDate) < now,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 },
    )
  }

  // Verify client belongs to this user
  const client = await db.client.findFirst({
    where: { id: parsed.data.clientId, userId: session.user.id, deletedAt: null },
  })
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { taxRate: true, currency: true },
  })

  const currency = parsed.data.currency ?? user?.currency ?? "MYR"
  const taxRate = parsed.data.taxRate ?? user?.taxRate ?? 0

  // Calculate totals from line items
  const items = parsed.data.items
  const { subtotal, tax, total } = calculateInvoiceTotals(items, taxRate, parsed.data.discountAmount ?? 0, currency)

  const invoice = await db.$transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(session.user.id, tx)

    const newInvoice = await tx.invoice.create({
      data: {
        userId: session.user.id,
        clientId: parsed.data.clientId,
        invoiceNumber,
        currency,
        issueDate: new Date(parsed.data.issueDate),
        dueDate: new Date(parsed.data.dueDate),
        taxRate,
        subtotalAmount: subtotal,
        taxAmount: tax,
        discountAmount: parsed.data.discountAmount ?? 0,
        totalAmount: total,
        notes: parsed.data.notes,
        terms: parsed.data.terms,
        items: {
          create: items.map((item, i) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: calculateItemAmount(item.quantity, item.unitPrice),
            sortOrder: item.sortOrder ?? i,
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true } },
        items: true,
      },
    })

    return newInvoice
  })

  return NextResponse.json(invoice, { status: 201 })
}
