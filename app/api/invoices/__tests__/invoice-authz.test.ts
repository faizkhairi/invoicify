import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    invoice: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET, PATCH } from "@/app/api/invoices/[invoiceId]/route"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any
const mockFindFirst = vi.mocked(db.invoice.findFirst)

function paramsFor(invoiceId: string) {
  return { params: Promise.resolve({ invoiceId }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/invoices/:invoiceId", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null)

    const res = await GET(new Request("http://test"), paramsFor("inv-1"))

    expect(res.status).toBe(401)
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it("scopes the lookup to the session user id", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    mockFindFirst.mockResolvedValue({ id: "inv-1", userId: "user-1" } as never)

    await GET(new Request("http://test"), paramsFor("inv-1"))

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "inv-1", userId: "user-1" }),
      }),
    )
  })

  it("returns 404 for an invoice belonging to a different user (foreign id)", async () => {
    // findFirst is scoped by userId, so an invoice owned by someone else never matches
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    mockFindFirst.mockResolvedValue(null)

    const res = await GET(new Request("http://test"), paramsFor("someone-elses-invoice"))

    expect(res.status).toBe(404)
  })

  it("returns 200 with the invoice for its owner", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    mockFindFirst.mockResolvedValue({ id: "inv-1", userId: "user-1", totalAmount: 1000 } as never)

    const res = await GET(new Request("http://test"), paramsFor("inv-1"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.id).toBe("inv-1")
  })
})

describe("PATCH /api/invoices/:invoiceId", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null)

    const res = await PATCH(
      new Request("http://test", { method: "PATCH", body: "{}" }),
      paramsFor("inv-1"),
    )

    expect(res.status).toBe(401)
  })

  it("returns 404 for a foreign invoice id before validating the body", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    mockFindFirst.mockResolvedValue(null)

    const res = await PATCH(
      new Request("http://test", { method: "PATCH", body: "{}" }),
      paramsFor("not-mine"),
    )

    expect(res.status).toBe(404)
  })

  it("rejects edits to a PAID invoice with 422", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    mockFindFirst.mockResolvedValue({
      id: "inv-1",
      userId: "user-1",
      status: "PAID",
    } as never)

    const res = await PATCH(
      new Request("http://test", { method: "PATCH", body: "{}" }),
      paramsFor("inv-1"),
    )

    expect(res.status).toBe(422)
  })

  it("rejects edits to a VOID invoice with 422", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    mockFindFirst.mockResolvedValue({
      id: "inv-1",
      userId: "user-1",
      status: "VOID",
    } as never)

    const res = await PATCH(
      new Request("http://test", { method: "PATCH", body: "{}" }),
      paramsFor("inv-1"),
    )

    expect(res.status).toBe(422)
  })
})
