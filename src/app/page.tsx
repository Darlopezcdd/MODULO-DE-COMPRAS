'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Users, FileText, BarChart3, AlertTriangle, PackageSearch, Banknote } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.usuario) setUser(data.usuario);
      })
      .catch(console.error);

    const fetchInventario = async () => {
      try {
        const res = await fetch('/api/inventarios?limite=200');
        const result = await res.json();
        if (result.success) {
          const ordenados = result.data.sort((a: any, b: any) => a.stockActual - b.stockActual);
          setProductos(ordenados);
        }
      } catch (e) {
        console.error("Error al cargar inventario", e);
      } finally {
        setCargando(false);
      }
    };
    fetchInventario();
  }, []);

  const handleProductClick = (codigo: string) => {
    if (user?.permisos?.crear_facturas || user?.rol === 'ADMIN') {
      router.push(`/facturas/nueva?producto=${encodeURIComponent(codigo)}`);
    } else {
      alert('No tienes permisos para crear facturas de compra.');
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#d20a11]/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#706f6f]/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto p-8 relative z-10 pt-16 md:pt-24">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-emerald-600 text-sm font-medium mb-4 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Panel de Control Activo
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            UTN <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d20a11] to-rose-600">Compras</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-light">
            Monitorea el nivel de stock global de la empresa y reabastece los productos críticos con un solo clic, al mejor precio posible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Quick Access Menu - Left Column */}
          <div className="lg:col-span-1 space-y-4">
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
              <Link href="/proveedores" className="group flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 hover:border-[#706f6f] hover:shadow-md transition-all">
                <div className="bg-[#706f6f]/10 p-3 rounded-lg group-hover:bg-[#706f6f]/20 transition-colors">
                  <Users className="w-6 h-6 text-[#706f6f]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Proveedores</h3>
                  <p className="text-sm text-slate-500">Gestionar directorio y catálogos</p>
                </div>
              </Link>
            )}

            {user?.permisos?.ver_reportes && (
              <Link href="/reportes" className="group flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 hover:border-[#d20a11] hover:shadow-md transition-all">
                <div className="bg-[#d20a11]/10 p-3 rounded-lg group-hover:bg-[#d20a11]/20 transition-colors">
                  <BarChart3 className="w-6 h-6 text-[#d20a11]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Reportes PDF</h3>
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

          {/* Alerts & Inventory - Right Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <PackageSearch className="w-5 h-5 text-[#d20a11]" /> Estado del Inventario Global
                </h2>
                <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                  {productos.length} productos
                </span>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                {cargando ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-[#d20a11] rounded-full animate-spin mb-4"></div>
                    <p>Sincronizando inventario...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {productos.map((prod) => {
                      const isUrgent = prod.stockActual === 0;
                      const isWarning = prod.stockActual > 0 && prod.stockActual <= 5;
                      
                      return (
                        <button
                          key={prod.codigo}
                          onClick={() => handleProductClick(prod.codigo)}
                          className={`flex flex-col text-left p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-1 ${
                            isUrgent 
                              ? 'bg-rose-50 border-rose-200 hover:border-rose-400' 
                              : isWarning
                                ? 'bg-amber-50 border-amber-200 hover:border-amber-400'
                                : 'bg-white border-slate-200 hover:border-[#d20a11]'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full mb-2">
                            <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                              isUrgent ? 'bg-rose-100 text-rose-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {prod.codigo}
                            </span>
                            {isUrgent && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                          </div>
                          
                          <h3 className="font-bold text-slate-900 truncate w-full mb-1" title={prod.nombre}>
                            {prod.nombre}
                          </h3>
                          
                          <div className="mt-auto pt-2 flex items-center justify-between w-full border-t border-slate-100/50">
                            <span className="text-sm text-slate-500">Stock Actual:</span>
                            <span className={`text-lg font-black ${
                              isUrgent ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {prod.stockActual}
                            </span>
                          </div>
                          
                          {isUrgent && (
                            <div className="mt-2 text-xs font-semibold text-rose-600 bg-white/60 px-2 py-1 rounded w-full text-center">
                              ¡Requiere compra urgente!
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
