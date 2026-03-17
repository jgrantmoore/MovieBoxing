// /auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const res = await fetch("https://movie-boxing-api-crcre7fbeednahfq.eastus-01.azurewebsites.net/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });
        const user = await res.json();
        
        if (res.ok && user) {
          return user; 
        }
        return null;
      },
    }),
  ],
  // Optional: Add session strategy if using JWT
  session: {
    strategy: "jwt",
  },
};