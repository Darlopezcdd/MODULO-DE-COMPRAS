'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Users, FileText, BarChart3, AlertTriangle, PackageSearch, Banknote, ShoppingCart, Activity, DollarSign, Check, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AlertBanner from '@/components/AlertBanner';

export default function Home() {
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [metricas, setMetricas] = useState({
    comprasMes: 0,
    proveedoresActivos: 0,
    alertasCriticas: 0
  });
  const [activeTab, setActiveTab] = useState<'CRITICO' | 'TODO'>('CRITICO');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.usuario) setUser(data.usuario);
      })
      .catch(console.error);

    const fetchDashboardData = async () => {
      try {
        const [invRes, provRes, factRes] = await Promise.all([
          fetch('/api/inventarios?limite=200'),
          fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ listarProveedores(estado: ACTIVO) { id } }' })
          }),
          fetch('/api/facturas')
        ]);
        
        const [invData, provData, factData] = await Promise.all([
          invRes.json(),
          provRes.json(),
          factRes.json()
        ]);
        
        let productosList = [];
        if (invData.success) {
          productosList = invData.data.sort((a: any, b: any) => a.stockActual - b.stockActual);
          setProductos(productosList);
        }

        const proveedoresActivos = provData?.data?.listarProveedores?.length || 0;
        
        let comprasMes = 0;
        if (factData?.facturas) {
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          comprasMes = factData.facturas.reduce((sum: number, f: any) => {
            const fDate = f.fechaEmision || f.createdAt;
            if (fDate) {
              const d = new Date(fDate);
              if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                return sum + Number(f.total || 0);
              }
            }
            return sum;
          }, 0);
        }

        setMetricas({
          comprasMes,
          proveedoresActivos,
          alertasCriticas: productosList.filter((p: any) => p.stockActual === 0).length
        });

      } catch (e) {
        console.error("Error al cargar datos del dashboard", e);
      } finally {
        setCargando(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleProductClick = (codigo: string) => {
    if (user?.permisos?.crear_facturas || user?.rol === 'ADMIN') {
      router.push(`/facturas/nueva?producto=${encodeURIComponent(codigo)}`);
    } else {
      alert('No tienes permisos para crear facturas de compra.');
    }
  };

  const productosFiltrados = activeTab === 'CRITICO' 
    ? productos.filter(p => p.stockActual <= 5)
    : productos;

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

        {/* KPIs (Indicadores) */}
        {!cargando && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="bg-rose-100 p-4 rounded-xl text-rose-600 shrink-0">
                <Activity className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Alertas Críticas</p>
                <h3 className="text-3xl font-black text-slate-900">{metricas.alertasCriticas}</h3>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="bg-blue-100 p-4 rounded-xl text-blue-600 shrink-0">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Proveedores Activos</p>
                <h3 className="text-3xl font-black text-slate-900">{metricas.proveedoresActivos}</h3>
              </div>
            </div>
          </div>
        )}

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
              <Link href="/proveedores" className="group flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 hover:border-[#d20a11] hover:shadow-md transition-all">
                <div className="bg-[#d20a11]/10 p-3 rounded-lg group-hover:bg-[#d20a11]/20 transition-colors">
                  <Users className="w-6 h-6 text-[#d20a11]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Proveedores</h3>
                  <p className="text-sm text-slate-500">Ver directorio y explorar catálogos</p>
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
              
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4 shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <PackageSearch className="w-5 h-5 text-[#d20a11]" /> Estado del Inventario Global
                  </h2>
                  <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                    {productosFiltrados.length} productos
                  </span>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-slate-200/50 p-1 rounded-lg self-start">
                  <button 
                    onClick={() => setActiveTab('CRITICO')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                      activeTab === 'CRITICO' 
                        ? 'bg-white text-rose-600 shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Atención Inmediata
                    {productos.filter(p => p.stockActual <= 5).length > 0 && (
                      <span className="bg-rose-100 text-rose-700 py-0.5 px-2 rounded-full text-xs font-bold">
                        {productos.filter(p => p.stockActual <= 5).length}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveTab('TODO')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      activeTab === 'TODO' 
                        ? 'bg-white text-[#d20a11] shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    Catálogo Completo
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                {cargando ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-[#d20a11] rounded-full animate-spin mb-4"></div>
                    <p>Sincronizando inventario...</p>
                  </div>
                ) : productosFiltrados.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-4 animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                      <Check className="w-10 h-10 text-emerald-500" />
                    </div>
                    <p className="text-xl font-medium text-slate-700">Todo está bajo control</p>
                    <p className="mt-2">No hay productos en estado crítico actualmente. Buen trabajo manteniendo el stock.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {productosFiltrados.map((prod) => {
                      const isUrgent = prod.stockActual === 0;
                      const isWarning = prod.stockActual > 0 && prod.stockActual <= 5;
                      
                      return (
                        <div
                          key={prod.codigo}
                          className={`flex flex-col text-left p-5 rounded-xl border transition-all shadow-sm bg-white hover:-translate-y-1 ${
                            isUrgent 
                              ? 'border-rose-300 shadow-rose-100 hover:shadow-rose-200' 
                              : isWarning
                                ? 'border-amber-300 shadow-amber-100 hover:shadow-amber-200'
                                : 'border-slate-200 hover:border-[#d20a11] hover:shadow-md'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full mb-3">
                            <span className={`text-xs font-mono px-2 py-1 rounded-md font-semibold ${
                              isUrgent ? 'bg-rose-100 text-rose-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {prod.codigo}
                            </span>
                            {isUrgent && (
                              <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100 animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> AGOTADO
                              </span>
                            )}
                          </div>
                          
                          <h3 className="font-bold text-slate-900 truncate w-full mb-4 text-base" title={prod.nombre}>
                            {prod.nombre}
                          </h3>
                          
                          <div className="flex items-center justify-between w-full mb-5">
                            <span className="text-sm font-medium text-slate-500">Stock en Bodega:</span>
                            <span className={`text-3xl font-black ${
                              isUrgent ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-700'
                            }`}>
                              {prod.stockActual}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => handleProductClick(prod.codigo)}
                            className={`mt-auto w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all ${
                              isUrgent
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200'
                                : 'bg-[#d20a11] hover:bg-[#b0080e] text-white shadow-md shadow-red-100'
                            }`}
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Reabastecer
                          </button>
                        </div>
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
