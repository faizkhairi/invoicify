import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateProfileSchema } from "@/lib/validations"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      businessName: true,
      businessRegNo: true,
      address: true,
      phone: true,
      logoUrl: true,
      taxId: true,
      taxRate: true,
      currency: true,
      paymentTerms: true,
    },
  })

  return NextResponse.json(user)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 },
    )
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { id: true, name: true, businessName: true, currency: true, taxRate: true },
  })

  return NextResponse.json(user)
}
