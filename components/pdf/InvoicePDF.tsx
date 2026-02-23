// SERVER-ONLY — never import this in 'use client' components.
// @react-pdf/renderer runs in Node.js and streams a PDF ReadableStream.
// Importing it in client code will crash the build.

import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer"
import type { InvoiceStatus, PaymentMethod } from "@/app/generated/prisma"
import { formatCurrency } from "@/lib/currency"

interface PDFUser {
  name: string | null
  businessName: string | null
  businessRegNo: string | null
  address: string | null
  phone: string | null
  taxId: string | null
  taxRate: number
  currency: string
}

interface PDFClient {
  name: string
  email: string
  company: string | null
  address: string | null
  regNo: string | null
}

interface PDFItem {
  description: string
  quantity: number  // units × 100
  unitPrice: number // minor units
  amount: number    // minor units
}

interface PDFPayment {
  amount: number
  method: PaymentMethod
  paidAt: Date
}

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string
    status: InvoiceStatus
    currency: string
    issueDate: Date
    dueDate: Date
    subtotalAmount: number
    taxRate: number
    taxAmount: number
    discountAmount: number
    totalAmount: number
    notes: string | null
    terms: string | null
    items: PDFItem[]
    payments: PDFPayment[]
  }
  user: PDFUser
  client: PDFClient
}

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1a1a2e" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  businessName: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  label: { fontSize: 8, color: "#6b7280", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 10, color: "#111827" },
  invoiceTitle: { fontSize: 28, fontWeight: "bold", color: "#2563eb", textAlign: "right" },
  invoiceNumber: { fontSize: 12, color: "#6b7280", textAlign: "right", marginTop: 4 },
  section: { marginBottom: 24 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  col: { flex: 1 },
  divider: { borderBottom: "1pt solid #e5e7eb", marginBottom: 16, marginTop: 8 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", padding: "8 10", borderRadius: 4 },
  tableHeaderText: { fontSize: 8, fontWeight: "bold", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", padding: "8 10", borderBottom: "1pt solid #f3f4f6" },
  tableRowAlt: { flexDirection: "row", padding: "8 10", backgroundColor: "#fafafa", borderBottom: "1pt solid #f3f4f6" },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 2, textAlign: "right" },
  colAmount: { flex: 2, textAlign: "right" },
  totalsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  totalsLabel: { width: 120, textAlign: "right", color: "#6b7280", marginRight: 16 },
  totalsValue: { width: 100, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, paddingTop: 8, borderTop: "2pt solid #2563eb" },
  totalLabel: { width: 120, textAlign: "right", fontWeight: "bold", fontSize: 12, marginRight: 16 },
  totalValue: { width: 100, textAlign: "right", fontWeight: "bold", fontSize: 12, color: "#2563eb" },
  footer: { marginTop: 32, paddingTop: 16, borderTop: "1pt solid #e5e7eb" },
  footerText: { fontSize: 8, color: "#9ca3af", textAlign: "center" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, alignSelf: "flex-start" },
})

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#e5e7eb",
  SENT: "#dbeafe",
  PARTIAL: "#fef3c7",
  PAID: "#d1fae5",
  OVERDUE: "#fee2e2",
  CANCELLED: "#e5e7eb",
  VOID: "#e5e7eb",
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtQty(qty: number) {
  // qty is units × 100 — show as decimal: 250 → 2.50, 100 → 1.00
  return (qty / 100).toFixed(2)
}

export default function InvoicePDF({ invoice, user, client }: InvoicePDFProps) {
  const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0)
  const balance = invoice.totalAmount - totalPaid

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>{user.businessName ?? user.name ?? "My Business"}</Text>
            {user.businessRegNo && (
              <Text style={[styles.value, { fontSize: 9, color: "#6b7280" }]}>Reg: {user.businessRegNo}</Text>
            )}
            {user.address && <Text style={[styles.value, { fontSize: 9, color: "#6b7280", marginTop: 4, maxWidth: 200 }]}>{user.address}</Text>}
            {user.phone && <Text style={[styles.value, { fontSize: 9, color: "#6b7280" }]}>{user.phone}</Text>}
            {user.taxId && <Text style={[styles.value, { fontSize: 9, color: "#6b7280" }]}>SST: {user.taxId}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <View style={{ marginTop: 8, alignItems: "flex-end" }}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[invoice.status] ?? "#e5e7eb" }]}>
                <Text style={{ fontSize: 9, fontWeight: "bold" }}>{invoice.status}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Billing info */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={[styles.value, { fontWeight: "bold", marginTop: 4 }]}>{client.name}</Text>
            {client.company && <Text style={styles.value}>{client.company}</Text>}
            {client.regNo && <Text style={styles.value}>Reg: {client.regNo}</Text>}
            {client.address && <Text style={[styles.value, { color: "#6b7280", maxWidth: 200 }]}>{client.address}</Text>}
          </View>
          <View style={[styles.col, { alignItems: "flex-end" }]}>
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Issue Date</Text>
              <Text style={styles.value}>{fmtDate(invoice.issueDate)}</Text>
            </View>
            <View>
              <Text style={styles.label}>Due Date</Text>
              <Text style={[styles.value, { fontWeight: "bold" }]}>{fmtDate(invoice.dueDate)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Line items table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
        </View>
        {invoice.items.map((item, i) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colQty}>{fmtQty(item.quantity)}</Text>
            <Text style={styles.colPrice}>{formatCurrency(item.unitPrice, invoice.currency)}</Text>
            <Text style={styles.colAmount}>{formatCurrency(item.amount, invoice.currency)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatCurrency(invoice.subtotalAmount, invoice.currency)}</Text>
          </View>
          {invoice.discountAmount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>-{formatCurrency(invoice.discountAmount, invoice.currency)}</Text>
            </View>
          )}
          {invoice.taxAmount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax ({(invoice.taxRate / 100).toFixed(0)}%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(invoice.taxAmount, invoice.currency)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.totalAmount, invoice.currency)}</Text>
          </View>
          {totalPaid > 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Amount Paid</Text>
                <Text style={styles.totalsValue}>{formatCurrency(totalPaid, invoice.currency)}</Text>
              </View>
              <View style={[styles.totalsRow, { marginTop: 4 }]}>
                <Text style={[styles.totalsLabel, { fontWeight: "bold" }]}>Balance Due</Text>
                <Text style={[styles.totalsValue, { fontWeight: "bold" }]}>{formatCurrency(balance, invoice.currency)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Notes and Terms */}
        {(invoice.notes || invoice.terms) && (
          <View style={{ marginTop: 24 }}>
            <View style={styles.divider} />
            {invoice.notes && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.label}>Notes</Text>
                <Text style={[styles.value, { color: "#6b7280", marginTop: 4 }]}>{invoice.notes}</Text>
              </View>
            )}
            {invoice.terms && (
              <View>
                <Text style={styles.label}>Payment Terms</Text>
                <Text style={[styles.value, { color: "#6b7280", marginTop: 4 }]}>{invoice.terms}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by Invoicify · {invoice.invoiceNumber}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
