import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { renderToStream } from "@react-pdf/renderer"
import InvoicePDF from "@/components/pdf/InvoicePDF"

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
      payments: { orderBy: { paidAt: "asc" } },
    },
  })
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      businessName: true,
      businessRegNo: true,
      address: true,
      phone: true,
      taxId: true,
      taxRate: true,
      currency: true,
    },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Render PDF to a Node.js ReadableStream and pipe it to the Response
  const pdfStream = await renderToStream(
    InvoicePDF({
      invoice: {
        ...invoice,
        items: invoice.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          amount: i.amount,
        })),
        payments: invoice.payments.map((p) => ({
          amount: p.amount,
          method: p.method,
          paidAt: p.paidAt,
        })),
      },
      user,
      client: invoice.client,
    }),
  )

  // Convert Node.js stream to Web ReadableStream for the Response
  const webStream = new ReadableStream({
    start(controller) {
      pdfStream.on("data", (chunk: Buffer) => controller.enqueue(chunk))
      pdfStream.on("end", () => controller.close())
      pdfStream.on("error", (err: Error) => controller.error(err))
    },
  })

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  })
}
