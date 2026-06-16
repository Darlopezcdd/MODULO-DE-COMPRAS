import React from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';

export default function FacturasPage() {
  const facturasMock = [
    { id: 'FAC-001', proveedor: 'Tech Solutions S.A.', fecha: '2023-10-01', total: '$1,200.00', estado: 'PAGADA' },
    { id: 'FAC-002', proveedor: 'Distribuidora Central', fecha: '2023-10-05', total: '$850.50', estado: 'PENDIENTE' },
    { id: 'FAC-003', proveedor: 'Servicios Integrales', fecha: '2023-10-12', total: '$3,400.00', estado: 'VENCIDA' },
  ];

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Facturas</h1>
          <Link href="/facturas/nueva" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
            <Plus className="w-5 h-5" /> Nueva Factura
          </Link>
        </div>

        <div className="glass-panel p-4 rounded-xl flex gap-4 items-center">
          <span className="text-sm font-semibold text-slate-600">Buscar:</span>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por proveedor o código..." 
              className="bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2 rounded-lg outline-none w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="glass-panel rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">Código</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Proveedor</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Fecha</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Total</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Estado</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturasMock.map(f => (
                <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-sm text-slate-500">{f.id}</td>
                  <td className="p-4 text-slate-900 font-medium">{f.proveedor}</td>
                  <td className="p-4 text-slate-500">{f.fecha}</td>
                  <td className="p-4 font-medium text-slate-900">{f.total}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      f.estado === 'PAGADA' ? 'bg-emerald-100 text-emerald-700' : 
                      f.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {f.estado}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button className="text-sm bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1 rounded transition-colors shadow-sm">
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
