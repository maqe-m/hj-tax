'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  email: string;
  full_name: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user || null))
      .catch(() => null);
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  // Don't show navbar on login/register
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const navLinks = [
    { href: '/companies', label: 'Компании' },
    { href: '/calculators', label: 'Калькуляторы' },
    { href: '/chat', label: 'Чат' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 h-16 flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold text-lg text-blue-600">
            KZ Tax Advisor
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'text-blue-600 font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {user && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              {user.full_name}
              <span className="text-xs">▼</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 z-50">
                <p className="px-4 py-2 text-xs text-gray-400">{user.email}</p>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
