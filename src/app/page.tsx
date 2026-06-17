import Link from 'next/link';
import { ArrowRight, Users, FileText, BarChart2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-4 pt-20 pb-10 bg-gradient-to-b from-blue-50/50 to-white">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-medium mb-8">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Sistema en línea
      </div>

      <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-tight mb-6">
        Gestión Inteligente de <br className="hidden md:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
          Compras
        </span>
      </h1>

      <p className="text-lg text-slate-500 max-w-2xl mb-10 leading-relaxed">
        Centraliza tus proveedores, automatiza la facturación y obtén métricas en tiempo real. Diseñado para escalar.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-20">
        <Link href="/proveedores/nuevo" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-blue-200">
          Comenzar ahora
          <ArrowRight size={18} />
        </Link>
        <Link href="/reportes" className="inline-flex items-center justify-center px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-medium transition-all shadow-sm">
          Ver Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full text-left">
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6">
            <Users size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Proveedores</h3>
          <p className="text-slate-500 leading-relaxed">
            Administra tu cartera de proveedores, evalúa su desempeño y mantén su información actualizada en un solo lugar.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
            <FileText size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Facturación</h3>
          <p className="text-slate-500 leading-relaxed">
            Registra nuevas facturas, controla los estados de pago y organiza el historial detallado de todas tus compras.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-6">
            <BarChart2 size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Reportes</h3>
          <p className="text-slate-500 leading-relaxed">
            Visualiza gráficas interactivas, revisa tu presupuesto al instante y toma decisiones estratégicas basadas en datos reales.
          </p>
        </div>
      </div>
    </div>
  );
}
