'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {!isLogin && <Sidebar />}
      <main className={`flex-1 ${!isLogin ? 'ml-64' : ''} min-h-screen relative`}>
        {children}
      </main>
    </div>
  );
}
