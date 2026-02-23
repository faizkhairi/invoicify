import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const now = new Date()

  const [invoices, payments] = await Promise.all([
    db.invoice.findMany({
      where: { userId, status: { notIn: ["VOID", "CANCELLED", "DRAFT"] } },
      select: { id: true, totalAmount: true, status: true, dueDate: true },
    }),
    db.payment.findMany({
      where: { invoice: { userId } },
      select: { amount: true },
    }),
  ])

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
  const outstanding = invoices
    .filter((i) => i.status !== "PAID")
    .reduce((s, i) => s + i.totalAmount, 0)
  const overdue = invoices
    .filter((i) => (i.status === "SENT" || i.status === "PARTIAL") && new Date(i.dueDate) < now)
    .reduce((s, i) => s + i.totalAmount, 0)

  return NextResponse.json({ totalInvoiced, totalCollected, outstanding, overdue })
}
