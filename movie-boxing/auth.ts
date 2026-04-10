import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      username?: string; // Add this line
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    accessToken?: string;
    username?: string; // Add this line
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
          // 1. Call your Azure Function Login endpoint
          const res = await fetch(`${process.env.NEXT_PUBLIC_LOGIN_URL}`, {
            method: 'POST',
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/json" },
            signal: controller.signal //abort if it takes longer than 60 seconds, for the Azure cold start
          });

          clearTimeout(timeoutId);

          const data = await res.json();

          if (res.ok && data.token) {
            return {
              id: String(data.userId),
              name: data.displayName,
              username: data.username, // Make sure this matches the key in your Azure jsonBody
              email: data.email,
              accessToken: data.token,
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
    async signIn({ user, account, profile }) {
      console.log("DEBUG: Provider is:", account?.provider);
      console.log("DEBUG: User object from provider:", user);
      console.log("DEBUG: API Env var:", process.env.API_URL);
      console.log("DEBUG: Next Public api url:", process.env.NEXT_PUBLIC_API_URL);

      if (account?.provider === "google") {
        try {
          // Send Google info to a NEW Azure Function endpoint
          const res = await fetch(`${process.env.API_URL}/users/sync-google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
            }),
          });

          console.log("DEBUG: Sync response from API:", res);

          const data = await res.json();

          if (res.ok && data.token) {
            // Attach the API's token and internal ID to the user object
            // so the JWT callback can pick it up later
            user.accessToken = data.token;
            user.id = String(data.userId);
            user.username = data.username;
            return true; // Allow sign in
          } else {
            return false; // Deny if backend fails to sync
          }
        } catch (error) {
          console.error("Google Sync Error:", error);
          return false;
        }
      }
      return true; // For Credentials login
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.accessToken = user.accessToken;
        token.username = user.username; // Grab it from the authorize return
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.name = token.name as string;
        session.user.username = token.username as string; // Pass it to the client
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 24hr
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);