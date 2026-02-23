import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto bg-muted/20">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  )
}
