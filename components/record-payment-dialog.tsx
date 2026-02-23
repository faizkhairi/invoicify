"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "DUITNOW", label: "DuitNow" },
  { value: "FPAY", label: "FPX / Online" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "ONLINE", label: "Other Online" },
]

export function RecordPaymentDialog({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("BANK_TRANSFER")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(parseFloat(amount) * 100),
        method,
        reference: reference || undefined,
        notes: notes || undefined,
        paidAt,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Failed to record payment")
      return
    }
    toast.success("Payment recorded")
    setOpen(false)
    setAmount("")
    setReference("")
    setNotes("")
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Record Payment</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="amount">Amount (RM) *</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="paidAt">Payment Date</Label>
            <Input
              id="paidAt"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reference">Reference / Receipt No.</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Save Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
