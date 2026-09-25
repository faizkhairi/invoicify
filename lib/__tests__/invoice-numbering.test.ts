import { describe, it, expect, vi } from "vitest"
import { generateInvoiceNumber } from "@/lib/invoice-numbering"

function makeMockTx(nextValueAfterUpsert: number) {
  return {
    invoiceCounter: {
      upsert: vi.fn().mockResolvedValue(undefined),
      findUnique: vi.fn().mockResolvedValue({ nextValue: nextValueAfterUpsert }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe("generateInvoiceNumber", () => {
  it("formats the first invoice of a year as NNN = 001", async () => {
    const tx = makeMockTx(2) // create path sets nextValue to 2, so seq = 1
    const year = new Date().getFullYear()
    const result = await generateInvoiceNumber("user-1", tx)
    expect(result).toBe(`INV-${year}-001`)
  })

  it("zero-pads sequence numbers to 3 digits", async () => {
    const tx = makeMockTx(43) // seq = 42
    const result = await generateInvoiceNumber("user-1", tx)
    expect(result).toMatch(/INV-\d{4}-042$/)
  })

  it("does not zero-pad beyond 3 digits for large sequences", async () => {
    const tx = makeMockTx(1235) // seq = 1234
    const result = await generateInvoiceNumber("user-1", tx)
    expect(result).toMatch(/INV-\d{4}-1234$/)
  })

  it("upserts on (userId, year) and increments rather than reading-then-writing", async () => {
    const tx = makeMockTx(5)
    await generateInvoiceNumber("user-42", tx)
    expect(tx.invoiceCounter.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_year: { userId: "user-42", year: expect.any(Number) } },
        update: { nextValue: { increment: 1 } },
      }),
    )
  })
})
