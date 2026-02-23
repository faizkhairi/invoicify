import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateInvoiceSchema } from "@/lib/validations"
import { calculateInvoiceTotals, calculateItemAmount } from "@/lib/currency"

type Params = { params: Promise<{ invoiceId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { invoiceId } = await params
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, userId: session.user.id },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  })
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

  return NextResponse.json(invoice)
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { invoiceId } = await params
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, userId: session.user.id },
  })
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  if (invoice.status === "PAID" || invoice.status === "VOID" || invoice.status === "CANCELLED") {
    return NextResponse.json({ error: "Cannot edit a paid, voided, or cancelled invoice" }, { status: 422 })
  }

  const body = await req.json()
  const parsed = updateInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 },
    )
  }

  const taxRate = parsed.data.taxRate ?? invoice.taxRate
  const discountAmount = parsed.data.discountAmount ?? invoice.discountAmount
  const currency = parsed.data.currency ?? invoice.currency
  const items = parsed.data.items

  const updatedInvoice = await db.$transaction(async (tx) => {
    // If items provided, replace them all
    if (items) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId } })
      const { subtotal, tax, total } = calculateInvoiceTotals(items, taxRate, discountAmount, currency)

      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          ...(parsed.data.issueDate && { issueDate: new Date(parsed.data.issueDate) }),
          ...(parsed.data.dueDate && { dueDate: new Date(parsed.data.dueDate) }),
          currency,
          taxRate,
          subtotalAmount: subtotal,
          taxAmount: tax,
          discountAmount,
          totalAmount: total,
          notes: parsed.data.notes,
          terms: parsed.data.terms,
          pdfUrl: null,
          pdfGeneratedAt: null,
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
        include: { items: true, client: { select: { id: true, name: true } } },
      })
    }

    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        ...(parsed.data.issueDate && { issueDate: new Date(parsed.data.issueDate) }),
        ...(parsed.data.dueDate && { dueDate: new Date(parsed.data.dueDate) }),
        notes: parsed.data.notes,
        terms: parsed.data.terms,
        pdfUrl: null,
        pdfGeneratedAt: null,
      },
      include: { items: true, client: { select: { id: true, name: true } } },
    })
  })

  return NextResponse.json(updatedInvoice)
}
