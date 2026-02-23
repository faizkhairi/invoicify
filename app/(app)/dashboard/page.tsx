import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/currency"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { format } from "date-fns"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const [summary, recentInvoices] = await Promise.all([
    fetch(`${process.env.NEXTAUTH_URL}/api/dashboard/summary`, {
      headers: { Cookie: "" },
      cache: "no-store",
    })
      .then((r) => r.json())
      .catch(() => ({ totalInvoiced: 0, totalCollected: 0, outstanding: 0, overdue: 0 })),
    db.invoice.findMany({
      where: { userId, status: { not: "VOID" } },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  const statusColor: Record<string, string> = {
    DRAFT: "secondary",
    SENT: "default",
    PARTIAL: "outline",
    PAID: "default",
    OVERDUE: "destructive",
    CANCELLED: "secondary",
    VOID: "secondary",
  }

  const currency = recentInvoices[0]?.currency ?? "MYR"

  const stats = [
    { label: "Total Invoiced", value: formatCurrency(summary.totalInvoiced ?? 0, currency) },
    { label: "Total Collected", value: formatCurrency(summary.totalCollected ?? 0, currency) },
    { label: "Outstanding", value: formatCurrency(summary.outstanding ?? 0, currency) },
    { label: "Overdue", value: formatCurrency(summary.overdue ?? 0, currency) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back, {session?.user?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Invoices</CardTitle>
          <Link href="/invoices" className="text-sm text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No invoices yet.{" "}
              <Link href="/invoices/new" className="underline">
                Create your first invoice
              </Link>
            </p>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-muted"
                >
                  <div>
                    <span className="font-medium">{inv.invoiceNumber}</span>
                    <span className="ml-2 text-muted-foreground">{inv.client.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusColor[inv.status] as never}>{inv.status}</Badge>
                    <span className="font-medium">{formatCurrency(inv.totalAmount, inv.currency)}</span>
                    <span className="text-muted-foreground">
                      {format(new Date(inv.dueDate), "d MMM yyyy")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
