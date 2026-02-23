import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/currency"
import { format } from "date-fns"
import { ArrowLeft, Download } from "lucide-react"
import { RecordPaymentDialog } from "@/components/record-payment-dialog"

type Props = { params: Promise<{ invoiceId: string }> }

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "default",
  VIEWED: "default",
  PARTIAL: "outline",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
  VOID: "secondary",
}

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CASH: "Cash",
  CHEQUE: "Cheque",
  DUITNOW: "DuitNow",
  FPAY: "FPX / Online",
  CREDIT_CARD: "Credit Card",
  ONLINE: "Other Online",
}

export default async function InvoiceDetailPage({ params }: Props) {
  const session = await auth()
  const { invoiceId } = await params

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, userId: session!.user!.id! },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  })
  if (!invoice) notFound()

  const isOverdue =
    (invoice.status === "SENT" || invoice.status === "PARTIAL") &&
    new Date(invoice.dueDate) < new Date()

  const canRecordPayment =
    invoice.status !== "PAID" && invoice.status !== "VOID" && invoice.status !== "CANCELLED"

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/invoices"><ArrowLeft size={16} /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
            <Badge variant={isOverdue ? "destructive" : statusColor[invoice.status] ?? "secondary"}>
              {isOverdue ? "OVERDUE" : invoice.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{invoice.client.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
              <Download size={14} />
              PDF
            </a>
          </Button>
          {canRecordPayment && <RecordPaymentDialog invoiceId={invoice.id} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 text-left font-medium">Description</th>
                    <th className="py-2 text-right font-medium">Qty</th>
                    <th className="py-2 text-right font-medium">Unit Price</th>
                    <th className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2">{item.description}</td>
                      <td className="py-2 text-right">{(item.quantity / 100).toFixed(2)}</td>
                      <td className="py-2 text-right">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(item.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotalAmount, invoice.currency)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>- {formatCurrency(invoice.discountAmount, invoice.currency)}</span>
                  </div>
                )}
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax ({invoice.taxRate / 100}%)</span>
                    <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Paid</span>
                      <span>- {formatCurrency(totalPaid, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Balance Due</span>
                      <span>
                        {formatCurrency(Math.max(0, invoice.totalAmount - totalPaid), invoice.currency)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {invoice.payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between py-1 border-b last:border-0">
                      <div>
                        <span className="font-medium">
                          {METHOD_LABEL[payment.method] ?? payment.method}
                        </span>
                        {payment.reference && (
                          <span className="ml-2 text-muted-foreground">#{payment.reference}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={payment.amount < 0 ? "text-destructive" : ""}>
                          {payment.amount < 0 ? "-" : ""}
                          {formatCurrency(Math.abs(payment.amount), invoice.currency)}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(payment.paidAt), "d MMM yyyy")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Invoice Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Date</span>
                <span>{format(new Date(invoice.issueDate), "d MMM yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span className={isOverdue ? "text-destructive font-medium" : ""}>
                  {format(new Date(invoice.dueDate), "d MMM yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span>{invoice.currency}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Bill To</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{invoice.client.name}</p>
              {invoice.client.company && (
                <p className="text-muted-foreground">{invoice.client.company}</p>
              )}
              <p>{invoice.client.email}</p>
              {invoice.client.address && (
                <p className="text-muted-foreground whitespace-pre-line">{invoice.client.address}</p>
              )}
            </CardContent>
          </Card>

          {(invoice.notes || invoice.terms) && (
            <Card>
              <CardContent className="pt-4 space-y-3 text-sm">
                {invoice.notes && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Notes</p>
                    <p className="whitespace-pre-line">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Terms</p>
                    <p className="whitespace-pre-line">{invoice.terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
