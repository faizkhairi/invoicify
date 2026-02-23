"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

const CURRENCIES = ["MYR", "USD", "SGD", "EUR", "GBP", "AUD"]

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    businessRegNo: "",
    taxId: "",
    address: "",
    phone: "",
    currency: "MYR",
    taxRate: "0",
    paymentTerms: "",
  })

  useEffect(() => {
    setLoading(true)
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name ?? "",
          businessName: data.businessName ?? "",
          businessRegNo: data.businessRegNo ?? "",
          taxId: data.taxId ?? "",
          address: data.address ?? "",
          phone: data.phone ?? "",
          currency: data.currency ?? "MYR",
          taxRate: data.taxRate != null ? String(data.taxRate / 100) : "0",
          paymentTerms: data.paymentTerms ?? "",
        })
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false))
  }, [])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        taxRate: Math.round(parseFloat(form.taxRate || "0") * 100),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Failed to save settings")
      return
    }
    toast.success("Settings saved")
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Business details shown on your invoices
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Profile</CardTitle>
            <CardDescription>Shown on invoices as the sender details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="businessName">Business / Trading Name</Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(e) => set("businessName", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="businessRegNo">SSM Reg. No.</Label>
              <Input
                id="businessRegNo"
                placeholder="e.g. 202301012345"
                value={form.businessRegNo}
                onChange={(e) => set("businessRegNo", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="taxId">SST Reg. No.</Label>
              <Input
                id="taxId"
                placeholder="e.g. W10-1908-32000001"
                value={form.taxId}
                onChange={(e) => set("taxId", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={3}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Default Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.taxRate}
                onChange={(e) => set("taxRate", e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="paymentTerms">Default Payment Terms</Label>
              <Textarea
                id="paymentTerms"
                rows={2}
                placeholder="Payment due within 30 days"
                value={form.paymentTerms}
                onChange={(e) => set("paymentTerms", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </form>
    </div>
  )
}
