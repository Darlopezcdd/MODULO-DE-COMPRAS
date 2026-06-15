'use client';
// src/components/ReportesTabla.tsx
// HU6 — Componente de tabla, renderizando estados vacíos y mapeo JSON (Tarea: Aldahir Requene)

import React from 'react';

// Estructura esperada del JSON (Endpoint que hará Dario López)
export interface FacturaReporteData {
  id: string;
  numero: string;
  fechaEmision: string;
  proveedor: string;
  tipoPago: 'CONTADO' | 'CREDITO';
  subtotal: number;
  iva: number;
  total: number;
}

interface ReportesTablaProps {
  data: FacturaReporteData[] | null; // null = Estado inicial (Aún no se ha buscado)
  isLoading: boolean;
}

const fmt = (n: number) => `$${n.toFixed(2)}`;

export default function ReportesTabla({ data, isLoading }: ReportesTablaProps) {
  
  // ── ESTADO 1: Cargando (Skeletons) ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-slate-700">
          <div className="h-6 bg-slate-800 rounded w-48 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-800/50 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // ── ESTADO 2: Inicial (Sin búsqueda) ────────────────────────────────────────
  if (data === null) {
    return (
      <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center py-20 mt-6 transition-all">
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">📅</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Seleccione un rango de fechas</h3>
        <p className="text-slate-400 text-sm max-w-sm text-center">
          Utilice los filtros superiores para seleccionar el rango y generar el reporte de facturas.
        </p>
      </div>
    );
  }

  // ── ESTADO 3: Vacío (Búsqueda sin resultados) ───────────────────────────────
  if (data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-2xl flex flex-col items-center justify-center py-20 mt-6 shadow-2xl">
        <div className="w-20 h-20 bg-red-900/20 border border-red-500/20 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl opacity-80">📄</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No se encontraron facturas</h3>
        <p className="text-slate-400 text-sm max-w-sm text-center">
          No existen registros de compras en el rango de fechas seleccionado.
        </p>
      </div>
    );
  }

  // ── ESTADO 4: Tabla de Resultados (Mapeo JSON) ──────────────────────────────
  const totalesGeneral = data.reduce(
    (acc, curr) => {
      acc.subtotal += curr.subtotal;
      acc.iva += curr.iva;
      acc.total += curr.total;
      return acc;
    },
    { subtotal: 0, iva: 0, total: 0 }
  );

  return (
    <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-6 py-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-blue-400">📋</span> Resultados del Reporte
        </h3>
        <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">
          {data.length} Registro(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-800 border-b border-slate-700 tracking-wider">
            <tr>
              <th className="px-6 py-4">Factura N°</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Proveedor</th>
              <th className="px-6 py-4 text-center">Tipo Pago</th>
              <th className="px-6 py-4 text-right">Subtotal</th>
              <th className="px-6 py-4 text-right">IVA</th>
              <th className="px-6 py-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.map((factura) => (
              <tr key={factura.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-mono text-blue-400 font-medium">
                  {factura.numero}
                </td>
                <td className="px-6 py-4 text-slate-300">
                  {factura.fechaEmision}
                </td>
                <td className="px-6 py-4 text-white font-medium">
                  {factura.proveedor}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                    factura.tipoPago === 'CONTADO' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {factura.tipoPago}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-slate-300 font-mono">
                  {fmt(factura.subtotal)}
                </td>
                <td className="px-6 py-4 text-right text-slate-400 font-mono">
                  {fmt(factura.iva)}
                </td>
                <td className="px-6 py-4 text-right text-emerald-400 font-bold font-mono">
                  {fmt(factura.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-800/80 border-t border-slate-600">
            <tr>
              <td colSpan={4} className="px-6 py-4 text-right font-bold text-white uppercase text-xs tracking-wider">
                Total General del Período
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-300 font-mono">
                {fmt(totalesGeneral.subtotal)}
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-400 font-mono">
                {fmt(totalesGeneral.iva)}
              </td>
              <td className="px-6 py-4 text-right font-bold text-emerald-400 text-lg font-mono">
                {fmt(totalesGeneral.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
