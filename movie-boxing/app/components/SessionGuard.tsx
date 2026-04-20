'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage = pathname === '/login' || pathname === '/register' || pathname === '/';

  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      // Use redirect: true to force a hard reload of the app state
      signOut({ callbackUrl: '/login', redirect: true });
      return; // Exit early
    }

    if (status === 'loading') return;

    if (status === 'unauthenticated' && !isPublicPage) {
      router.replace('/login');
    }
  }, [status, pathname, isPublicPage, router, session?.error]);

  // NEW: Global 401 Listener
  useEffect(() => {
    const handleUnauthorized = () => {
      // If any fetch request returns a 401, kick them to login
      signOut({ callbackUrl: '/login' });
    };

    window.addEventListener('movieboxing-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('movieboxing-unauthorized', handleUnauthorized);
  }, []);

  if (status === 'loading') {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            {/* Your cool red spinner */}
        </div>
    );
  }

  if (status === 'unauthenticated' && !isPublicPage) return null;

  return <>{children}</>;
};