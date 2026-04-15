'use client';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage = pathname === '/login' || pathname === '/register' || pathname === '/';

  useEffect(() => {
    // If loading, wait for status.
    if (status === 'loading') return;

    // Redirect to login if not authenticated and trying to access a protected route
    if (status === 'unauthenticated' && !isPublicPage) {
      router.replace('/login');
    }
  }, [status, pathname, isPublicPage, router]);

  // 1. Loading State: Keep it consistent with your app's branding
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
             <div className="h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
             <div className="text-red-600 font-black uppercase italic tracking-widest animate-pulse">
                Syncing Profile...
             </div>
        </div>
      </div>
    );
  }

  // 2. Auth Check: If middleware missed it or client-side status is trailing, 
  // hide the children until the redirect in useEffect kicks in.
  if (status === 'unauthenticated' && !isPublicPage) {
    return null;
  }

  return <>{children}</>;
};