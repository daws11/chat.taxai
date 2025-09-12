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
          console.log('❌ Missing credentials');
          return null;
        }

        // Normalize email to avoid case-sensitivity issues across services
        const normalizedEmail = credentials.email.trim().toLowerCase();
        console.log('🔐 NextAuth authorize called with:', { email: normalizedEmail, password: '***' });

        try {
          await connectToDatabase();
          console.log('✅ Database connected');
          
          const user = await User.findOne({ email: normalizedEmail });
          
          if (!user) {
            console.log('❌ User not found for email:', credentials.email);
            return null;
          }

          console.log('✅ User found:', {
            id: user._id,
            email: user.email,
            hasPassword: !!user.password,
            passwordLength: user.password ? user.password.length : 0
          });

          // Simple password validation - no additional checks
          if (!user.password) {
            console.log('❌ User has no password hash');
            return null;
          }

          // Debug password comparison
          console.log('🔍 Comparing passwords...');
          console.log('Input password length:', credentials.password.length);
          console.log('Stored hash length:', user.password.length);

          const isValid = await user.comparePassword(credentials.password);
          console.log('Password validation result:', isValid);
          
          if (!isValid) {
            console.log('❌ Password validation failed');
            return null;
          }

          console.log('✅ Password validated successfully');

          // Return user data without additional validations
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || 'Unknown User',
            subscription: user.subscription,
            jobTitle: user.jobTitle,
            language: user.language,
            trialUsed: user.trialUsed,
          } as AuthUser;
        } catch (error) {
          console.error('❌ Auth error:', error);
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
        
        // Always fetch fresh user data to ensure subscription is up-to-date
        if (token.id) {
          try {
            const { User } = await import('@/lib/models/user');
            const userDoc = await User.findById(token.id)
              .select('subscription language jobTitle trialUsed')
              .lean();
            
            if (userDoc) {
              if (userDoc.subscription) {
                session.user.subscription = {
                  messageLimit: userDoc.subscription.messageLimit,
                  remainingMessages: userDoc.subscription.remainingMessages,
                };
                // Update cached subscription in token
                token.subscription = userDoc.subscription;
              }
              session.user.language = userDoc.language;
              session.user.jobTitle = userDoc.jobTitle;
              session.user.trialUsed = userDoc.trialUsed;
            }
          } catch (error) {
            console.error('Error fetching user data in session callback:', error);
            // Fallback to cached data if available
            if (token.subscription) {
              session.user.subscription = {
                messageLimit: token.subscription.messageLimit,
                remainingMessages: token.subscription.remainingMessages,
              };
            }
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signOut: 'https://ask.taxai.ae/login',
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
        secure: process.env.NEXTAUTH_URL?.startsWith('https://') || false,
        domain: process.env.NEXTAUTH_URL?.includes('localhost') ? undefined : (process.env.COOKIE_DOMAIN || '.taxai.ae'),
      },
    },
  },
};
