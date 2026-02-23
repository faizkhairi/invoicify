"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Plus, Trash2, ArrowLeft } from "lucide-react"

type Client = { id: string; name: string; company: string | null }
type Item = { description: string; quantity: string; unitPrice: string }

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get("clientId") ?? ""

  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState(preselectedClientId)
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  )
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: "1", unitPrice: "" }])
  const [notes, setNotes] = useState("")
  const [terms, setTerms] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients).catch(() => {})
  }, [])

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: "1", unitPrice: "" }])
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) { toast.error("Please select a client"); return }

    const payload = {
      clientId,
      issueDate,
      dueDate,
      notes: notes || undefined,
      terms: terms || undefined,
      items: items.map((item, i) => ({
        description: item.description,
        // quantity stored as units × 100 (e.g. 1.5 hrs = 150)
        quantity: Math.round(parseFloat(item.quantity || "0") * 100),
        unitPrice: Math.round(parseFloat(item.unitPrice || "0") * 100),
        sortOrder: i,
      })),
    }

    setLoading(true)
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Failed to create invoice")
      return
    }
    const invoice = await res.json()
    toast.success(`Invoice ${invoice.invoiceNumber} created`)
    router.push(`/invoices/${invoice.id}`)
  }

  const subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity || "0")
    const price = parseFloat(item.unitPrice || "0")
    return sum + qty * price
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/invoices"><ArrowLeft size={16} /></Link>
        </Button>
        <h1 className="text-2xl font-bold">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-3">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.company ? ` — ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus size={14} /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6 space-y-1">
                  {i === 0 && <Label>Description</Label>}
                  <Input
                    placeholder="Service description"
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <Label>Qty</Label>}
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  {i === 0 && <Label>Unit Price (RM)</Label>}
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-1">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeItem(i)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-end pt-2 text-sm font-medium">
              Subtotal: RM {subtotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notes & Terms</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="notes">Notes (shown on invoice)</Label>
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="terms">Payment Terms</Label>
              <Textarea id="terms" rows={2} placeholder="Payment due within 30 days" value={terms} onChange={(e) => setTerms(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create Invoice"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/invoices">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
