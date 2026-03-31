'use client';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. If NextAuth is still figuring out who the user is, DO NOTHING.
    if (status === 'loading') return;

    // 2. Define public routes that don't need a session.
    const isPublicPage = pathname === '/login' || pathname === '/register';

    // 3. Only kick them to login if:
    //    - They are confirmed unauthenticated
    //    - They aren't already on a public page
    if (status === 'unauthenticated' && !isPublicPage) {
      console.log("Guard: Unauthenticated user on protected route. Redirecting...");
      router.replace('/login'); // Use .replace so they can't "back button" into a loop
    }
    
    // 4. Optional: If they ARE logged in but try to go to /login, send them to dashboard
    if (status === 'authenticated' && isPublicPage) {
       router.replace('/dashboard');
    }

  }, [status, pathname, router]);

  // IMPORTANT: Do not render the children if we are in the middle of a redirect.
  // This prevents the "Flash of Protected Content" before the kickback.
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-600 font-black italic animate-pulse">VERIFYING AUTH...</div>
      </div>
    );
  }

  // If unauthenticated and on a protected page, render nothing while the useEffect redirects
  if (status === 'unauthenticated' && pathname !== '/login') {
      return null; 
  }

  return <>{children}</>;
};