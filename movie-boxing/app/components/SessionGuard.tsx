// components/SessionGuard.tsx
'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';

export const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();

  useEffect(() => {
    // If the session status is 'unauthenticated', force a redirect
    if (status === 'unauthenticated') {
      signOut({ callbackUrl: '/login' });
    }
  }, [status]);

  return <>{children}</>;
};