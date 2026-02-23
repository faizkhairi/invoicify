import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
})

export const config = {
  matcher: [
    "/(app)/:path*",
    "/dashboard/:path*",
    "/clients/:path*",
    "/invoices/:path*",
    "/settings/:path*",
  ],
}
