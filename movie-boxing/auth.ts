import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

// Standard NextAuth types don't include 'accessToken' or 'id' on the session.
// We extend them here so TypeScript is happy.
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    sub?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          // 1. Call your Azure Function Login endpoint
          const res = await fetch(`${process.env.NEXT_PUBLIC_LOGIN_URL}`, {
            method: 'POST',
            body: JSON.stringify({
              email: credentials.username, 
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/json" }
          });

          const data = await res.json();

          // 2. Map the Azure response to the NextAuth User object
          if (res.ok && data.token) {
            return {
              // NextAuth requires 'id' as a string
              id: data.userId || "1", 
              name: data.DisplayName || credentials.username,
              accessToken: data.token, // This is the JWT from your Azure Function
            };
          }
          
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    // This runs whenever a JWT is created or updated
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.sub = user.id;
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/sync-google`, {
            method: 'POST',
            body: JSON.stringify({
              email: user.email,
              name: user.name,
            }),
            headers: { 'Content-Type': 'application/json' }
          });
          return response.ok; // If false, NextAuth denies sign-in
        } catch (error) {
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour to match your Azure JWT expiry
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);