import React from 'react';
import { BarChart3, TrendingUp, Users, FileText } from 'lucide-react';

export default function ReportesPage() {
  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Dashboard de Reportes</h1>
          <p className="text-slate-500 mt-2">Resumen general de las operaciones de compras y facturación.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-500 font-medium">Total Compras</h3>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-4">$45,231.00</p>
            <p className="text-sm text-emerald-600 mt-2 font-medium">+12.5% este mes</p>
          </div>
          
          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-500 font-medium">Facturas Pendientes</h3>
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-4">12</p>
            <p className="text-sm text-yellow-600 mt-2 font-medium">Requieren pago</p>
          </div>

          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-500 font-medium">Proveedores Activos</h3>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-4">84</p>
            <p className="text-sm text-slate-500 mt-2 font-medium">2 agregados hoy</p>
          </div>

          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-500 font-medium">Presupuesto Consumido</h3>
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-4">78%</p>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-xl mt-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-8">Gastos por Categoría (Demo)</h3>
          <div className="h-64 flex items-end gap-6 justify-around pt-10">
            <div className="flex flex-col items-center gap-3 w-full group">
              <div className="w-full max-w-[5rem] bg-blue-500 hover:bg-blue-600 rounded-t-md transition-colors shadow-sm" style={{ height: '80%' }}></div>
              <span className="text-sm font-medium text-slate-600">Tecnología</span>
            </div>
            <div className="flex flex-col items-center gap-3 w-full group">
              <div className="w-full max-w-[5rem] bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-colors shadow-sm" style={{ height: '45%' }}></div>
              <span className="text-sm font-medium text-slate-600">Insumos</span>
            </div>
            <div className="flex flex-col items-center gap-3 w-full group">
              <div className="w-full max-w-[5rem] bg-purple-500 hover:bg-purple-600 rounded-t-md transition-colors shadow-sm" style={{ height: '60%' }}></div>
              <span className="text-sm font-medium text-slate-600">Servicios</span>
            </div>
            <div className="flex flex-col items-center gap-3 w-full group">
              <div className="w-full max-w-[5rem] bg-yellow-500 hover:bg-yellow-600 rounded-t-md transition-colors shadow-sm" style={{ height: '30%' }}></div>
              <span className="text-sm font-medium text-slate-600">Logística</span>
            </div>
            <div className="flex flex-col items-center gap-3 w-full group">
              <div className="w-full max-w-[5rem] bg-red-500 hover:bg-red-600 rounded-t-md transition-colors shadow-sm" style={{ height: '90%' }}></div>
              <span className="text-sm font-medium text-slate-600">Maquinaria</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
