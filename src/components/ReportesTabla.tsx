'use client';
// src/components/ReportesTabla.tsx
// HU6 — Componente de tabla, renderizando estados vacíos y mapeo JSON (Tarea: Aldahir Requene)

import React from 'react';
import { Calendar, FileText, ClipboardList } from 'lucide-react';

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
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="h-6 bg-slate-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // ── ESTADO 2: Inicial (Sin búsqueda) ────────────────────────────────────────
  if (data === null) {
    return (
      <div className="bg-white border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center py-20 mt-6 transition-all shadow-sm">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400">
          <Calendar className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Seleccione un rango de fechas</h3>
        <p className="text-slate-500 text-sm max-w-sm text-center">
          Utilice los filtros superiores para seleccionar el rango y generar el reporte de facturas.
        </p>
      </div>
    );
  }

  // ── ESTADO 3: Vacío (Búsqueda sin resultados) ───────────────────────────────
  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-20 mt-6 shadow-sm">
        <div className="w-20 h-20 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mb-4 text-red-400">
          <FileText className="w-10 h-10 opacity-80" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No se encontraron facturas</h3>
        <p className="text-slate-500 text-sm max-w-sm text-center">
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
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#d20a11]" /> Resultados del Reporte
        </h3>
        <span className="bg-[#f0f0f0] text-[#706f6f] text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
          {data.length} Registro(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 tracking-wider">
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
          <tbody className="divide-y divide-slate-200">
            {data.map((factura) => (
              <tr key={factura.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-[#d20a11] font-medium">
                  {factura.numero}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {factura.fechaEmision}
                </td>
                <td className="px-6 py-4 text-slate-900 font-medium">
                  {factura.proveedor}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                    factura.tipoPago === 'CONTADO' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                      : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                    {factura.tipoPago}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-slate-600 font-mono">
                  {fmt(factura.subtotal)}
                </td>
                <td className="px-6 py-4 text-right text-slate-600 font-mono">
                  {fmt(factura.iva)}
                </td>
                <td className="px-6 py-4 text-right text-emerald-600 font-bold font-mono">
                  {fmt(factura.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td colSpan={4} className="px-6 py-4 text-right font-bold text-slate-900 uppercase text-xs tracking-wider">
                Total General del Período
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-700 font-mono">
                {fmt(totalesGeneral.subtotal)}
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-700 font-mono">
                {fmt(totalesGeneral.iva)}
              </td>
              <td className="px-6 py-4 text-right font-bold text-emerald-600 text-lg font-mono">
                {fmt(totalesGeneral.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
