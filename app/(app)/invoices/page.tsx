import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/currency"
import { format } from "date-fns"
import { Plus, FileText } from "lucide-react"

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

export default async function InvoicesPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const invoices = await db.invoice.findMany({
    where: { userId, status: { not: "VOID" } },
    include: {
      client: { select: { name: true } },
      _count: { select: { payments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const now = new Date()
  const enriched = invoices.map((inv) => ({
    ...inv,
    isOverdue:
      (inv.status === "SENT" || inv.status === "PARTIAL") && new Date(inv.dueDate) < now,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} total</p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus size={16} />
            New Invoice
          </Link>
        </Button>
      </div>

      {enriched.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="font-medium">No invoices yet</p>
            <p className="mt-1 text-sm">Create your first invoice to get started.</p>
            <Button asChild className="mt-4">
              <Link href="/invoices/new">Create Invoice</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {enriched.map((inv) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{inv.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">{inv.client.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={inv.isOverdue ? "destructive" : statusColor[inv.status] ?? "secondary"}>
                      {inv.isOverdue ? "OVERDUE" : inv.status}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatCurrency(inv.totalAmount, inv.currency)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Due {format(new Date(inv.dueDate), "d MMM yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
