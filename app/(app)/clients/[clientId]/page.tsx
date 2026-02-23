import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/currency"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"

type Props = { params: Promise<{ clientId: string }> }

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "default",
  PARTIAL: "outline",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
}

export default async function ClientDetailPage({ params }: Props) {
  const session = await auth()
  const { clientId } = await params

  const client = await db.client.findFirst({
    where: { id: clientId, userId: session!.user!.id!, deletedAt: null },
    include: {
      invoices: {
        where: { status: { not: "VOID" } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })
  if (!client) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft size={16} />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Email:</span> {client.email}</p>
            {client.phone && <p><span className="text-muted-foreground">Phone:</span> {client.phone}</p>}
            {client.regNo && <p><span className="text-muted-foreground">SSM No:</span> {client.regNo}</p>}
            {client.address && (
              <p><span className="text-muted-foreground">Address:</span><br />{client.address}</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Invoices</CardTitle>
            <Button size="sm" asChild>
              <Link href={`/invoices/new?clientId=${client.id}`}>New Invoice</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {client.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {client.invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{inv.invoiceNumber}</span>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusColor[inv.status] ?? "secondary"}>{inv.status}</Badge>
                      <span>{formatCurrency(inv.totalAmount, inv.currency)}</span>
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
    </div>
  )
}
