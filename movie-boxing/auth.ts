import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
              email: credentials.username, // Adjust key to match your API expectation
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/json" }
          });

          const user = await res.json();

          // 2. If the API returns a user and no error, return it to NextAuth
          if (res.ok && user) {
            // NextAuth expects an object with at least an 'id' or 'email'
            return {
              id: user.UserId || user.id, 
              name: user.Username || user.name,
              email: user.Email || user.email,
              image: user.ProfilePic || null,
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
    // This attaches the user ID to the session so you can use it in your hooks
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  pages: {
    signIn: '/login', // Redirects users here if they aren't logged in
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);