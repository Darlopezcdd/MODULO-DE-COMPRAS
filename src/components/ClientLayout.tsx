'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Breadcrumbs from './molecules/Breadcrumbs';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {!isLogin && <Sidebar />}
      <main className={`flex-1 ${!isLogin ? 'ml-64' : ''} min-h-screen relative flex flex-col`}>
        {!isLogin && (
          <div className="px-8 pt-6 pb-0 max-w-6xl mx-auto w-full">
            <Breadcrumbs />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
