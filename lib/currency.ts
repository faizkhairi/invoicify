/** Format minor units as a locale string: 1050 MYR → "RM10.50" */
export function formatCurrency(amountMinor: number, currencyCode = "MYR"): string {
  const amount = amountMinor / 100
  try {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`
  }
}

/**
 * Calculate invoice totals from line items.
 * All inputs and outputs are in minor units (sen / cents).
 */
export function calculateInvoiceTotals(
  items: { quantity: number; unitPrice: number }[], // quantity × 100, unitPrice in minor units
  taxRate: number, // percentage × 100 (e.g. 900 = 9%)
  discountAmount: number, // minor units
  _currencyCode = "MYR",
): { subtotal: number; tax: number; total: number } {
  let subtotal = 0
  for (const item of items) {
    subtotal += calculateItemAmount(item.quantity, item.unitPrice)
  }
  const tax = Math.round((subtotal * taxRate) / 10000)
  const total = Math.max(0, subtotal + tax - discountAmount)
  return { subtotal, tax, total }
}

/** Calculate the amount for a single line item */
export function calculateItemAmount(quantity: number, unitPrice: number): number {
  // quantity is units × 100 (e.g. 2.5 hrs = 250), unitPrice is in minor units
  return Math.round((quantity / 100) * unitPrice)
}
