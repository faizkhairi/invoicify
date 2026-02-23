import type { PrismaClient } from "@/app/generated/prisma"

type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

/**
 * Atomically increments the InvoiceCounter for (userId, year) and returns the
 * next invoice number string: "INV-2026-001".
 *
 * Must be called inside a db.$transaction to ensure no two concurrent requests
 * get the same number. The `upsert + raw increment` approach is race-condition-safe.
 *
 * Do NOT use MAX(invoiceNumber) + 1 — that approach requires string parsing and
 * reuses numbers from voided invoices.
 */
export async function generateInvoiceNumber(
  userId: string,
  tx: PrismaTransactionClient,
): Promise<string> {
  const year = new Date().getFullYear()

  // Upsert with atomic increment via raw SQL
  // Prisma doesn't natively support UPDATE ... RETURNING, so we upsert then re-fetch.
  await tx.invoiceCounter.upsert({
    where: { userId_year: { userId, year } },
    create: { userId, year, nextValue: 2 }, // starts at 2 because this request gets 1
    update: { nextValue: { increment: 1 } },
  })

  // Fetch the newly incremented value
  const counter = await tx.invoiceCounter.findUnique({
    where: { userId_year: { userId, year } },
    select: { nextValue: true },
  })

  // nextValue is already incremented; subtract 1 to get the value we just "consumed"
  const seq = (counter?.nextValue ?? 2) - 1

  // Zero-pad to 3 digits: INV-2026-001
  return `INV-${year}-${String(seq).padStart(3, "0")}`
}
