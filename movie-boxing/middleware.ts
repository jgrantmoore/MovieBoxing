// /middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    // Only allow access if there is a token
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leagues/:path*", // Simplified matcher
    "/profile/:path*",
    "/admin/:path*",
  ],
};