import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string; // Add this
    user: {
      id: string;
      username?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    accessToken?: string;
    refreshToken?: string; // Add this
    username?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string; // Add this
    username?: string;
    sub?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_LOGIN_URL}`, {
            method: 'POST',
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/json" },
          });

          const data = await res.json();

          // Match your new backend response keys (accessToken & refreshToken)
          if (res.ok && data.accessToken) {
            return {
              id: String(data.userId),
              name: data.displayName,
              username: data.username,
              email: data.email,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken, // Capture the refresh token
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
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const res = await fetch(`${process.env.API_URL}/users/sync-google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: user.email,
                name: user.name,
            }),
          });

          const data = await res.json();

          if (res.ok && data.accessToken) {
            user.accessToken = data.accessToken;
            user.refreshToken = data.refreshToken; // Store the new refresh token
            user.id = String(data.userId);
            user.username = data.username;
            return true;
          }
          return false;
        } catch (error) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken; // Pass refresh token to JWT
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.username = token.username as string;
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string; // Pass refresh token to Client
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // Set to 30 days to match your RefreshToken lifespan
  },
};

export default NextAuth(authOptions);