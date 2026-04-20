import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;    // Added ?
    refreshToken?: string;   // Added ?
    error?: "RefreshAccessTokenError";
    user: {
      id?: string;           // Added ?
      username?: string;
      displayName?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;              // id is usually required on User
    accessToken?: string;
    refreshToken?: string;
    username?: string;
    displayName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    username?: string;
    displayName?: string;
    sub?: string;
    error?: "RefreshAccessTokenError";
  }
}