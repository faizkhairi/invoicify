import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    client: { findFirst: vi.fn(), update: vi.fn() },
  },
}))

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { GET, PATCH, DELETE } from "@/app/api/clients/[clientId]/route"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any
const mockFindFirst = vi.mocked(db.client.findFirst)

function paramsFor(clientId: string) {
  return { params: Promise.resolve({ clientId }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/clients/:clientId", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null)

    const res = await GET(new Request("http://test"), paramsFor("client-1"))

    expect(res.status).toBe(401)
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it("scopes the lookup by userId and excludes soft-deleted clients", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    mockFindFirst.mockResolvedValue({ id: "client-1", userId: "user-1" } as never)

    await GET(new Request("http://test"), paramsFor("client-1"))

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "client-1", userId: "user-1", deletedAt: null }),
      }),
    )
  })

  it("returns 404 for a client belonging to a different user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    mockFindFirst.mockResolvedValue(null)

    const res = await GET(new Request("http://test"), paramsFor("someone-elses-client"))

    expect(res.status).toBe(404)
  })
})

describe("PATCH /api/clients/:clientId", () => {
  it("returns 404 for a foreign client id before writing anything", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    mockFindFirst.mockResolvedValue(null)

    const res = await PATCH(
      new Request("http://test", { method: "PATCH", body: "{}" }),
      paramsFor("not-mine"),
    )

    expect(res.status).toBe(404)
    expect(db.client.update).not.toHaveBeenCalled()
  })
})

describe("DELETE /api/clients/:clientId", () => {
  it("returns 404 for a foreign client id and never soft-deletes it", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    mockFindFirst.mockResolvedValue(null)

    const res = await DELETE(new Request("http://test"), paramsFor("not-mine"))

    expect(res.status).toBe(404)
    expect(db.client.update).not.toHaveBeenCalled()
  })

  it("scopes the soft-delete update to the session user id", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    mockFindFirst.mockResolvedValue({ id: "client-1", userId: "user-1" } as never)
    vi.mocked(db.client.update).mockResolvedValue({} as never)

    await DELETE(new Request("http://test"), paramsFor("client-1"))

    expect(db.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "client-1", userId: "user-1" }),
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    )
  })
})
