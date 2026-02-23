import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Invoicify — Invoice & Billing",
  description: "Simple invoicing for Malaysian freelancers and small businesses",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        {children}
        <Toaster richColors closeButton />
      </body>
    </html>
  )
}
