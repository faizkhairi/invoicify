import { z } from "zod"

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

// ─── Profile ──────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  businessName: z.string().optional(),
  businessRegNo: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  taxRate: z.number().int().min(0).max(10000).optional(), // percentage × 100
  currency: z.string().length(3).optional(),
  paymentTerms: z.string().optional(),
})

// ─── Clients ──────────────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  regNo: z.string().optional(),
  currency: z.string().length(3).default("MYR"),
  notes: z.string().optional(),
})

export const updateClientSchema = createClientSchema.partial()

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().positive("Quantity must be positive"), // units × 100
  unitPrice: z.number().int().min(0, "Unit price must be non-negative"), // minor units
  sortOrder: z.number().int().default(0),
})

export const createInvoiceSchema = z.object({
  clientId: z.string().cuid("Invalid client"),
  currency: z.string().length(3).default("MYR"),
  issueDate: z.string().datetime({ offset: true }).or(z.string().date()),
  dueDate: z.string().datetime({ offset: true }).or(z.string().date()),
  taxRate: z.number().int().min(0).max(10000).default(0),
  discountAmount: z.number().int().min(0).default(0), // minor units
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one line item is required"),
})

export const updateInvoiceSchema = createInvoiceSchema.partial().omit({ clientId: true })

export const cancelInvoiceSchema = z.object({
  reason: z.string().optional(),
})

// ─── Payments ─────────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  amount: z.number().int().positive("Amount must be positive"), // minor units
  method: z.enum(["BANK_TRANSFER", "CASH", "CHEQUE", "ONLINE", "CREDIT_CARD", "FPAY", "DUITNOW"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.string().datetime({ offset: true }).or(z.string().date()),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>
