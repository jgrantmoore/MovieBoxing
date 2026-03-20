// /middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // Redirect here if not authenticated
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",  // Protects /dashboard and all sub-routes
    "/leagues/:path*",   // Protects /leagues and all sub-routes
    "/profile",           // Protects just the /profile page
    "/admin/:path*",      // Protects admin routes
  ],
};