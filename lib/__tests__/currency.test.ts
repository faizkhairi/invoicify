import { describe, it, expect } from "vitest"
import { formatCurrency, calculateInvoiceTotals, calculateItemAmount } from "@/lib/currency"

describe("calculateItemAmount", () => {
  it("multiplies quantity (units x 100) by unit price in minor units", () => {
    // 2 units x RM10.00 (1000 sen) = 2000 sen
    expect(calculateItemAmount(200, 1000)).toBe(2000)
  })

  it("handles fractional quantities (e.g. 1.5 hours)", () => {
    // 1.5 hrs (150) x RM20.00/hr (2000 sen) = RM30.00 (3000 sen)
    expect(calculateItemAmount(150, 2000)).toBe(3000)
  })

  it("rounds to the nearest minor unit", () => {
    // 1.33 units (133) x 333 sen = 442.89 -> rounds to 443
    expect(calculateItemAmount(133, 333)).toBe(443)
  })

  it("returns 0 for zero quantity", () => {
    expect(calculateItemAmount(0, 1000)).toBe(0)
  })
})

describe("calculateInvoiceTotals", () => {
  it("sums line items, applies tax, and subtracts discount", () => {
    const items = [
      { quantity: 100, unitPrice: 1000 }, // 1000
      { quantity: 200, unitPrice: 500 }, // 1000
    ]
    // subtotal = 2000, taxRate = 900 (9%) -> tax = 180, discount = 200
    const result = calculateInvoiceTotals(items, 900, 200)
    expect(result.subtotal).toBe(2000)
    expect(result.tax).toBe(180)
    expect(result.total).toBe(1980)
  })

  it("applies zero tax and zero discount by default math", () => {
    const items = [{ quantity: 100, unitPrice: 500 }]
    const result = calculateInvoiceTotals(items, 0, 0)
    expect(result).toEqual({ subtotal: 500, tax: 0, total: 500 })
  })

  it("never returns a negative total when discount exceeds subtotal + tax", () => {
    const items = [{ quantity: 100, unitPrice: 500 }]
    const result = calculateInvoiceTotals(items, 0, 100_000)
    expect(result.total).toBe(0)
  })

  it("sums multiple line items independently before tax", () => {
    const items = [
      { quantity: 100, unitPrice: 100 },
      { quantity: 100, unitPrice: 200 },
      { quantity: 100, unitPrice: 300 },
    ]
    const result = calculateInvoiceTotals(items, 0, 0)
    expect(result.subtotal).toBe(600)
  })
})

describe("formatCurrency", () => {
  it("formats minor units as MYR by default", () => {
    expect(formatCurrency(1050)).toContain("10.50")
  })

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toContain("0.00")
  })

  it("falls back to a plain string for an invalid currency code", () => {
    const result = formatCurrency(1000, "NOTREAL")
    expect(result).toContain("10.00")
  })
})
