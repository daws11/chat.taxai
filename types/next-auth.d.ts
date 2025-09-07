import type { DefaultSession, DefaultUser } from "next-auth"
import type { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface User {
    subscription?: {
      messageLimit?: number;
      remainingMessages?: number;
    };
    language?: string;
    jobTitle?: string;
    trialUsed?: boolean;
  }
  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    email: string
    username: string
  }
}

