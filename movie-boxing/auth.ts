import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

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
    // This runs whenever the session is checked (useSession, getServerSession)
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