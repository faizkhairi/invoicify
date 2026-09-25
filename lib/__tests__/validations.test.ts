import { describe, it, expect } from "vitest"
import {
  registerSchema,
  loginSchema,
  createInvoiceSchema,
  createClientSchema,
  createPaymentSchema,
} from "@/lib/validations"

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "Passw0rd",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a password without an uppercase letter", () => {
    const result = registerSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "password1",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a password without a digit", () => {
    const result = registerSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "Password",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Alice",
      email: "not-an-email",
      password: "Passw0rd",
    })
    expect(result.success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("requires a non-empty password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "" })
    expect(result.success).toBe(false)
  })
})

describe("createClientSchema", () => {
  it("defaults currency to MYR", () => {
    const result = createClientSchema.parse({ name: "Acme", email: "acme@example.com" })
    expect(result.currency).toBe("MYR")
  })

  it("rejects a currency code that is not 3 characters", () => {
    const result = createClientSchema.safeParse({
      name: "Acme",
      email: "acme@example.com",
      currency: "RM",
    })
    expect(result.success).toBe(false)
  })
})

describe("createInvoiceSchema", () => {
  const base = {
    clientId: "cksdfjklasjdflkasjdfl", // cuid-shaped
    issueDate: "2026-01-01",
    dueDate: "2026-01-31",
    items: [{ description: "Consulting", quantity: 100, unitPrice: 1000, sortOrder: 0 }],
  }

  it("requires at least one line item", () => {
    const result = createInvoiceSchema.safeParse({ ...base, items: [] })
    expect(result.success).toBe(false)
  })

  it("rejects a negative unit price", () => {
    const result = createInvoiceSchema.safeParse({
      ...base,
      items: [{ description: "x", quantity: 100, unitPrice: -1, sortOrder: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects a non-positive quantity", () => {
    const result = createInvoiceSchema.safeParse({
      ...base,
      items: [{ description: "x", quantity: 0, unitPrice: 1000, sortOrder: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it("defaults taxRate and discountAmount to 0", () => {
    const result = createInvoiceSchema.parse(base)
    expect(result.taxRate).toBe(0)
    expect(result.discountAmount).toBe(0)
  })
})

describe("createPaymentSchema", () => {
  it("accepts a recognized payment method", () => {
    const result = createPaymentSchema.safeParse({
      amount: 1000,
      method: "DUITNOW",
      paidAt: "2026-01-01",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an unrecognized payment method", () => {
    const result = createPaymentSchema.safeParse({
      amount: 1000,
      method: "BITCOIN",
      paidAt: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a non-positive amount", () => {
    const result = createPaymentSchema.safeParse({
      amount: 0,
      method: "CASH",
      paidAt: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })
})
