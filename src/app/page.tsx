'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Users, FileText, BarChart3, Banknote } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AlertBanner from '@/components/AlertBanner';
import FinancialDashboard from '@/components/dashboards/FinancialDashboard';
import InventoryDashboard from '@/components/dashboards/InventoryDashboard';

export default function Home() {
  const [cargando, setCargando] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.usuario) setUser(data.usuario);
      })
      .catch(console.error)
      .finally(() => setCargando(false));
  }, []);

  const esFinanciero = user?.rol === 'TESORERO' || user?.rol === 'COMP_TESORERO';
  const esCompras = ['COMPRADOR', 'COMP_COMPRADOR', 'INV_BODEGUERO', 'GESTOR_PROVEEDORES', 'COMP_GESTOR_DE_PROVEEDORES'].includes(user?.rol);
  const esAdmin = user?.rol === 'ADMIN' || user?.rol === 'COMP_ADMIN' || user?.rol === 'AUDITOR';

  return (
    <div className="min-h-screen bg-background font-sans relative overflow-hidden pb-12">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#d20a11]/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#706f6f]/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto p-8 relative z-10 pt-16 md:pt-24">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-emerald-600 text-sm font-medium shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Panel de Control Activo
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            UTN <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d20a11] to-rose-600">Compras</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-light">
            Monitorea el inventario y reabastece los productos críticos con un solo clic, al mejor precio posible.
          </p>
        </div>

        {/* Layout Principal */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Quick Access Menu - Left Column */}
          <div className="w-full lg:w-1/4 space-y-4 shrink-0">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-[#d20a11]" /> Accesos Rápidos
            </h2>
            
            {(user?.permisos?.crear_facturas || user?.rol === 'ADMIN') && (
              <Link href="/facturas/nueva" className="group flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 hover:border-[#d20a11] hover:shadow-md transition-all">
                <div className="bg-[#d20a11]/10 p-3 rounded-lg group-hover:bg-[#d20a11]/20 transition-colors">
                  <FileText className="w-6 h-6 text-[#d20a11]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Nueva Factura</h3>
                  <p className="text-sm text-slate-500">Registrar una compra</p>
                </div>
              </Link>
            )}

            {user?.permisos?.ver_proveedores && (
              <Link href="/proveedores" className="group flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 hover:border-[#d20a11] hover:shadow-md transition-all">
                <div className="bg-[#d20a11]/10 p-3 rounded-lg group-hover:bg-[#d20a11]/20 transition-colors">
                  <Users className="w-6 h-6 text-[#d20a11]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Proveedores</h3>
                  <p className="text-sm text-slate-500">Ver directorio y catálogos</p>
                </div>
              </Link>
            )}

            {user?.permisos?.ver_reportes && (
              <Link href="/reportes" className="group flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 hover:border-[#d20a11] hover:shadow-md transition-all">
                <div className="bg-[#d20a11]/10 p-3 rounded-lg group-hover:bg-[#d20a11]/20 transition-colors">
                  <BarChart3 className="w-6 h-6 text-[#d20a11]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Reportes</h3>
                  <p className="text-sm text-slate-500">Generar informes gerenciales</p>
                </div>
              </Link>
            )}

            {user?.permisos?.gestionar_pagos && (
              <Link href="/tesoreria" className="group flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 hover:border-[#706f6f] hover:shadow-md transition-all">
                <div className="bg-[#706f6f]/10 p-3 rounded-lg group-hover:bg-[#706f6f]/20 transition-colors">
                  <Banknote className="w-6 h-6 text-[#706f6f]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Tesorería</h3>
                  <p className="text-sm text-slate-500">Gestión de pagos y cuentas</p>
                </div>
              </Link>
            )}
          </div>

          {/* Dashboards Dinámicos - Right Column */}
          <div className="w-full lg:w-3/4 flex flex-col gap-8">
            {cargando ? (
               <div className="h-64 flex items-center justify-center">
                 <div className="w-8 h-8 border-4 border-slate-200 border-t-[#d20a11] rounded-full animate-spin"></div>
               </div>
            ) : (
              <>
                {(esFinanciero || esAdmin) && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    {esAdmin && <h2 className="text-2xl font-bold text-slate-800 mb-6">Panorama Financiero</h2>}
                    <FinancialDashboard />
                  </div>
                )}
                
                {(esCompras || esAdmin) && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-150">
                    {esAdmin && <h2 className="text-2xl font-bold text-slate-800 mb-6 mt-8 pt-8 border-t border-slate-200">Inventario y Abastecimiento</h2>}
                    <InventoryDashboard user={user} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
