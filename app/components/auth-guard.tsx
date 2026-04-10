'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const publicPaths = ['/login', '/register'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Public pages don't need auth check
    if (publicPaths.some((path) => pathname.startsWith(path))) {
      setAuthenticated(true);
      setChecked(true);
      return;
    }

    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) {
          setAuthenticated(true);
        } else {
          router.replace('/login');
        }
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => setChecked(true));
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    );
  }

  if (!authenticated && !publicPaths.some((path) => pathname.startsWith(path))) {
    return null;
  }

  return <>{children}</>;
}
