import type { AuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { User as AuthUser } from "next-auth";
import Credentials from 'next-auth/providers/credentials';
import { User } from '@/lib/models/user';
import { connectToDatabase } from '@/lib/db';

// At the top of the file, add a reference to the type declaration for next-auth
// Add this to types/next-auth.d.ts if not already present:
// declare module 'next-auth' {
//   interface User {
//     subscription?: {
//       messageLimit?: number;
//       remainingMessages?: number;
//     };
//   }
//   interface Session {
//     user: User;
//   }
// }

// Define a Subscription type for clarity
interface Subscription {
  messageLimit?: number;
  remainingMessages?: number;
}

export const authConfig: AuthOptions = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          await connectToDatabase();
          
          const user = await User.findOne({ email: credentials.email });
          
          if (!user) {
            return null;
          }

          const isValid = await user.comparePassword(credentials.password);
          
          if (!isValid) {
            return null;
          }

          // Return type matches User interface in next-auth.d.ts
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
          } as AuthUser;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: AuthUser }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? "";
        token.name = user.name ?? "";

      }
      return token;
    },
    async session({ session, token }: { session: import('next-auth').Session; token: JWT }) {
      if (token && session.user) {
        session.user = {
          ...session.user,
          id: token.id,
          email: token.email as string,
          name: token.name as string,
        };
        // Add subscription info for sidebar progress bar
        const { User } = await import('@/lib/models/user');
        let userDoc = await User.findById(token.id).lean();
        if (Array.isArray(userDoc)) userDoc = userDoc[0];
        const subscription =
          userDoc && typeof userDoc === 'object' && userDoc !== null && 'subscription' in userDoc
            ? (userDoc as { subscription?: Subscription }).subscription
            : undefined;
        if (subscription) {
          session.user.subscription = {
            messageLimit: subscription.messageLimit,
            remainingMessages: subscription.remainingMessages,
          };
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24, // 1 hari
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // Hanya set domain dan secure di production
        ...(process.env.NODE_ENV === 'production'
          ? {
              secure: true,
              domain: process.env.COOKIE_DOMAIN || '.taxai.ae',
            }
          : {}),
      },
    },
  },
};
