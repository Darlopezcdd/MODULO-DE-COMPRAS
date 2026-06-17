'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, FileText, BarChart2 } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  if (pathname === '/login') return null;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-blue-600">Módulo</span> <span className="text-slate-800">Compras</span>
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        <Link href="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
          <Home size={20} className={isActive('/') ? 'text-blue-600' : 'text-slate-400'} />
          Inicio
        </Link>
        <Link href="/proveedores" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/proveedores') || pathname.startsWith('/proveedores/') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
          <Users size={20} className={isActive('/proveedores') || pathname.startsWith('/proveedores/') ? 'text-blue-600' : 'text-slate-400'} />
          Proveedores
        </Link>
        <Link href="/facturas" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/facturas') || pathname.startsWith('/facturas/') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
          <FileText size={20} className={isActive('/facturas') || pathname.startsWith('/facturas/') ? 'text-blue-600' : 'text-slate-400'} />
          Facturas
        </Link>
        <Link href="/reportes" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/reportes') || pathname.startsWith('/reportes/') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
          <BarChart2 size={20} className={isActive('/reportes') || pathname.startsWith('/reportes/') ? 'text-blue-600' : 'text-slate-400'} />
          Reportes
        </Link>
      </nav>
    </aside>
  );
}
