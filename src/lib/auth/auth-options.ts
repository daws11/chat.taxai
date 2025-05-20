import type { AuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { User as AuthUser } from "next-auth";
import Credentials from 'next-auth/providers/credentials';
import { User } from '@/lib/models/user';
import { connectToDatabase } from '@/lib/db';

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
            username: user.username,
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
        // Update token based on JWT interface in next-auth.d.ts
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }: { session: import('next-auth').Session; token: JWT }) {
      if (token && session.user) {
        // Update session based on Session interface in next-auth.d.ts
        session.user = {
          ...session.user,
          id: token.id,
          email: token.email as string,
          username: token.username as string,
        };
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
