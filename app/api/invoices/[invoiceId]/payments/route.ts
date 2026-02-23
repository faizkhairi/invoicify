import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createPaymentSchema } from "@/lib/validations"

type Params = { params: Promise<{ invoiceId: string }> }

// POST /api/invoices/:id/payments — record a payment
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { invoiceId } = await params
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, userId: session.user.id },
    include: { payments: true },
  })
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  if (invoice.status === "PAID" || invoice.status === "VOID" || invoice.status === "CANCELLED") {
    return NextResponse.json({ error: "Cannot add payment to this invoice" }, { status: 422 })
  }

  const body = await req.json()
  const parsed = createPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 },
    )
  }

  const payment = await db.$transaction(async (tx) => {
    const newPayment = await tx.payment.create({
      data: {
        invoiceId,
        amount: parsed.data.amount,
        method: parsed.data.method,
        reference: parsed.data.reference,
        notes: parsed.data.notes,
        paidAt: new Date(parsed.data.paidAt),
      },
    })

    // Sum all positive payments and subtract reversals
    const allPayments = await tx.payment.findMany({ where: { invoiceId } })
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0)

    // Auto-progress status based on total paid
    let newStatus = invoice.status
    if (totalPaid >= invoice.totalAmount) {
      newStatus = "PAID"
    } else if (totalPaid > 0) {
      newStatus = "PARTIAL"
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    })

    return newPayment
  })

  return NextResponse.json(payment, { status: 201 })
}
