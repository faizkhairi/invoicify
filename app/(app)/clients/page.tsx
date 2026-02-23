import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Building2 } from "lucide-react"

export default async function ClientsPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const clients = await db.client.findMany({
    where: { userId, deletedAt: null },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Plus size={16} />
            New Client
          </Link>
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="font-medium">No clients yet</p>
            <p className="mt-1 text-sm">Add your first client to start creating invoices.</p>
            <Button asChild className="mt-4">
              <Link href="/clients/new">Add Client</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {client.company ? `${client.company} · ` : ""}
                    {client.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    {client._count.invoices} invoice{client._count.invoices !== 1 ? "s" : ""}
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/clients/${client.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
