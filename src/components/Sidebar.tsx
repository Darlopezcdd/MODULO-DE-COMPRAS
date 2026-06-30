'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, FileText, BarChart2, LogOut, Banknote, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.usuario) {
          setUser(data.usuario);
        }
      })
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const isActive = (path: string) => pathname === path;

  if (pathname === '/login') return null;

  const permisos = user?.permisos || {};

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-[#d20a11]">UTN</span> <span className="text-[#706f6f]">Compras</span>
        </h1>
        {user && (
          <div className="mt-2 text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md inline-block">
            Rol: {user.rol}
          </div>
        )}
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
        <Link href="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/') ? 'bg-[#d20a11]/10 text-[#d20a11]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
          <Home size={20} className={isActive('/') ? 'text-[#d20a11]' : 'text-slate-400'} />
          Inicio
        </Link>
        
        {permisos.ver_proveedores && (
          <Link href="/proveedores" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/proveedores') || pathname.startsWith('/proveedores/') ? 'bg-[#d20a11]/10 text-[#d20a11]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Users size={20} className={isActive('/proveedores') || pathname.startsWith('/proveedores/') ? 'text-[#d20a11]' : 'text-slate-400'} />
            Proveedores
          </Link>
        )}

        {permisos.ver_facturas && (
          <Link href="/facturas" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/facturas') || pathname.startsWith('/facturas/') ? 'bg-[#d20a11]/10 text-[#d20a11]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <FileText size={20} className={isActive('/facturas') || pathname.startsWith('/facturas/') ? 'text-[#d20a11]' : 'text-slate-400'} />
            Facturas
          </Link>
        )}

        {permisos.ver_reportes && (
          <Link href="/reportes" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/reportes') || pathname.startsWith('/reportes/') ? 'bg-[#d20a11]/10 text-[#d20a11]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <BarChart2 size={20} className={isActive('/reportes') || pathname.startsWith('/reportes/') ? 'text-[#d20a11]' : 'text-slate-400'} />
            Reportes
          </Link>
        )}

        {permisos.gestionar_pagos && (
          <Link href="/tesoreria" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/tesoreria') || pathname.startsWith('/tesoreria/') ? 'bg-[#d20a11]/10 text-[#d20a11]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Banknote size={20} className={isActive('/tesoreria') || pathname.startsWith('/tesoreria/') ? 'text-[#d20a11]' : 'text-slate-400'} />
            Tesorería
          </Link>
        )}

        {permisos.ver_auditoria && (
          <Link href="/auditoria" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/auditoria') ? 'bg-[#d20a11]/10 text-[#d20a11]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Shield size={20} className={isActive('/auditoria') ? 'text-[#d20a11]' : 'text-slate-400'} />
            Auditoría
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
