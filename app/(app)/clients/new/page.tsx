"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    regNo: "",
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Failed to create client")
      return
    }
    toast.success("Client created")
    router.push("/clients")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft size={16} />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">New Client</h1>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Client Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
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
              <div className="space-y-1">
                <Label htmlFor="regNo">SSM Reg. No.</Label>
                <Input
                  id="regNo"
                  placeholder="e.g. 123456-K"
                  value={form.regNo}
                  onChange={(e) => set("regNo", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={3}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save Client"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/clients">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
