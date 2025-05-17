import type { DefaultSession, DefaultUser } from "next-auth"
import type { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      username: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string
    email: string
    username: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    email: string
    username: string
  }
}

