import React from 'react';
import Link from 'next/link';
import { ArrowRight, Users, FileText, BarChart3, ShieldCheck, Zap, Globe } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-100 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-100 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto p-8 relative z-10 pt-16 md:pt-24">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-emerald-600 text-sm font-medium mb-4 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sistema en línea
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Gestión Inteligente de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">Compras</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-light">
            Centraliza tus proveedores, automatiza la facturación y obtén métricas en tiempo real. Diseñado para escalar.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/facturas/nueva" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl font-medium transition-all hover:scale-105 flex items-center gap-2 text-lg shadow-[0_4px_14px_0_rgba(37,99,235,0.39)]">
              Comenzar ahora
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/reportes" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-medium transition-colors flex items-center gap-2 text-lg shadow-sm">
              Ver Dashboard
            </Link>
          </div>
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32">
          
          <Link href="/proveedores" className="group glass-panel p-8 rounded-2xl hover:border-blue-300 transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(59,130,246,0.08)]">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Proveedores</h3>
            <p className="text-slate-600 leading-relaxed">
              Administra tu cartera de proveedores, evalúa su desempeño y mantén su información actualizada en un solo lugar.
            </p>
          </Link>

          <Link href="/facturas" className="group glass-panel p-8 rounded-2xl hover:border-emerald-300 transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(16,185,129,0.08)]">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Facturación</h3>
            <p className="text-slate-600 leading-relaxed">
              Registra nuevas facturas, controla los estados de pago y organiza el historial detallado de todas tus compras.
            </p>
          </Link>

          <Link href="/reportes" className="group glass-panel p-8 rounded-2xl hover:border-purple-300 transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(168,85,247,0.08)]">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Reportes</h3>
            <p className="text-slate-600 leading-relaxed">
              Visualiza gráficas interactivas, revisa tu presupuesto al instante y toma decisiones estratégicas basadas en datos reales.
            </p>
          </Link>

        </div>

        {/* Features Highlight */}
        <div className="mt-32 mb-16 text-center">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-10">Por qué elegir nuestro módulo</p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-24">
            <div className="flex flex-col items-center gap-4 group">
              <div className="bg-white p-5 rounded-full shadow-sm group-hover:bg-yellow-50 transition-colors border border-slate-100">
                <Zap className="w-8 h-8 text-yellow-500" />
              </div>
              <span className="text-slate-800 font-medium text-lg">Ultra Rápido</span>
            </div>
            <div className="flex flex-col items-center gap-4 group">
              <div className="bg-white p-5 rounded-full shadow-sm group-hover:bg-green-50 transition-colors border border-slate-100">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
              <span className="text-slate-800 font-medium text-lg">100% Seguro</span>
            </div>
            <div className="flex flex-col items-center gap-4 group">
              <div className="bg-white p-5 rounded-full shadow-sm group-hover:bg-blue-50 transition-colors border border-slate-100">
                <Globe className="w-8 h-8 text-blue-500" />
              </div>
              <span className="text-slate-800 font-medium text-lg">Acceso Global</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
