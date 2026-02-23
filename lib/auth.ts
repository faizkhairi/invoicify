import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs"
import { db } from "@/lib/db"
import { z } from "zod"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    GitHub,
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findUnique({ where: { email: parsed.data.email } })
        if (!user?.password) return null

        const valid = await compare(parsed.data.password, user.password)
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email, image: user.image }
      },
    }),
  ],
  // JWT strategy required for Edge-compatible proxy/middleware
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
