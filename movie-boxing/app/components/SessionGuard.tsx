// components/SessionGuard.tsx
'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Wait until the session is fully done loading
    if (status === 'loading') return;

    // 2. Only redirect if they are explicitly NOT logged in
    // 3. EXEMPT the login page itself to prevent the loop
    if (status === 'unauthenticated' && pathname !== '/login') {
      // Use window.location or router.push instead of signOut to be less aggressive
      router.push('/login');
    }
  }, [status, pathname, router]);

  // Optional: Show a loading spinner while checking session 
  // so the user doesn't see "flashing" protected content
  if (status === 'loading') {
    return (
      <body className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-600 font-black italic animate-pulse">VERIFYING AUTH...</div>
      </body>
    );
  }

  return <>{children}</>;
};