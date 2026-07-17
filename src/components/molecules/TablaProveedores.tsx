'use client';
// src/components/molecules/TablaProveedores.tsx
// Molécula — Tabla visual de proveedores con 4 estados de UI
// Atomic Design: combina átomos ProveedorEstadoBadge + ProveedorTipoBadge
// Paleta UTN: #d20a11 (rojo), #706f6f (gris)

import { Users, SearchX, RefreshCw } from 'lucide-react';
import ProveedorEstadoBadge from '@/components/atoms/ProveedorEstadoBadge';
import ProveedorTipoBadge from '@/components/atoms/ProveedorTipoBadge';

// ── Tipo de datos que recibe la tabla ──────────────────────────────────────────
export interface ProveedorReporteData {
  id: number;
  cedulaRuc: string;
  nombre: string;
  ciudad: string;
  tipo: string;
  telefono: string;
  email: string;
  estado: string;
  saldoPendiente: number;
}

interface TablaProveedoresProps {
  data: ProveedorReporteData[] | null; // null = cargando por primera vez
  isLoading: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => `$${n.toFixed(2)}`;

// ── Skeleton de fila ───────────────────────────────────────────────────────────
function SkeletonFila() {
  return (
    <tr className="border-b border-[#E5E5E5]">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-5 py-4">
          <div
            className="h-4 rounded animate-pulse"
            style={{ backgroundColor: '#E5E5E5', width: i === 2 ? '70%' : '55%' }}
          />
        </td>
      ))}
    </tr>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function TablaProveedores({ data, isLoading }: TablaProveedoresProps) {

  // ── ESTADO 1: Cargando (skeletons) ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm">
        <div className="px-6 py-4 border-b border-[#E5E5E5]" style={{ backgroundColor: '#f8fafc' }}>
          <div className="h-5 w-44 rounded animate-pulse" style={{ backgroundColor: '#E5E5E5' }} />
        </div>
        <table className="w-full">
          <tbody>
            <SkeletonFila />
            <SkeletonFila />
            <SkeletonFila />
            <SkeletonFila />
          </tbody>
        </table>
      </div>
    );
  }

  // ── ESTADO 2: Sin datos (null = estado inicial antes de cargar) ─────────────
  if (data === null) {
    return (
      <div className="py-20 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
        <div className="bg-white p-6 rounded-full shadow-sm mb-4">
          <RefreshCw className="w-9 h-9 animate-spin" style={{ color: '#d20a11' }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#d20a11' }}>
          Cargando datos...
        </h3>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          Obteniendo el listado de proveedores desde la base de datos.
        </p>
      </div>
    );
  }

  // ── ESTADO 3: Vacío (búsqueda sin resultados) ───────────────────────────────
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] flex flex-col items-center justify-center py-20 shadow-sm">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5 border"
          style={{
            backgroundColor: 'rgba(230,81,0,0.06)',
            borderColor: 'rgba(230,81,0,0.20)',
          }}
        >
          <SearchX className="w-9 h-9" style={{ color: '#E65100' }} />
        </div>
        <h3 className="text-xl font-bold mb-2 text-slate-800">
          No se encontraron proveedores
        </h3>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          No existen proveedores que coincidan con los filtros seleccionados.
          Intenta cambiar los criterios de búsqueda.
        </p>
      </div>
    );
  }

  // ── ESTADO 4: Tabla con datos ───────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Cabecera de la tabla */}
      <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-slate-50">
        <h3 className="text-base font-bold flex items-center gap-2" style={{ color: '#d20a11' }}>
          <Users className="w-4 h-4" />
          Directorio de Proveedores
        </h3>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full border"
          style={{
            backgroundColor: 'rgba(112,111,111,0.10)',
            color: '#706f6f',
            borderColor: 'rgba(112,111,111,0.25)',
          }}
        >
          {data.length} registro{data.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla responsive */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr
              className="text-xs uppercase tracking-wider border-b border-[#E5E5E5]"
              style={{ backgroundColor: '#E5E5E5', color: '#706f6f' }}
            >
              <th className="px-5 py-3 font-semibold">Cédula / RUC</th>
              <th className="px-5 py-3 font-semibold">Nombre</th>
              <th className="px-5 py-3 font-semibold">Ciudad</th>
              <th className="px-5 py-3 font-semibold">Tipo</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold text-right">Saldo Pendiente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {data.map((p) => (
              <tr
                key={p.id}
                className="transition-colors hover:bg-slate-50 group"
              >
                {/* Cédula / RUC */}
                <td className="px-5 py-4 font-mono text-xs text-slate-500">
                  {p.cedulaRuc}
                </td>

                {/* Nombre */}
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-900">{p.nombre}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.email}</p>
                </td>

                {/* Ciudad */}
                <td className="px-5 py-4 text-slate-600">{p.ciudad}</td>

                {/* Tipo */}
                <td className="px-5 py-4">
                  <ProveedorTipoBadge tipo={p.tipo} />
                </td>

                {/* Estado */}
                <td className="px-5 py-4">
                  <ProveedorEstadoBadge estado={p.estado} />
                </td>

                {/* Saldo Pendiente */}
                <td className="px-5 py-4 text-right font-mono">
                  {p.saldoPendiente > 0 ? (
                    <span className="font-bold" style={{ color: '#E65100' }}>
                      {fmt(p.saldoPendiente)}
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold text-xs">
                      Sin deuda
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          {/* Pie con total de saldos */}
          {data.some((p) => p.saldoPendiente > 0) && (
            <tfoot>
              <tr style={{ backgroundColor: '#E5E5E5' }} className="border-t border-[#E5E5E5]">
                <td colSpan={5} className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#d20a11' }}>
                  Total Saldos Pendientes
                </td>
                <td className="px-5 py-3 text-right font-bold font-mono text-base" style={{ color: '#E65100' }}>
                  {fmt(data.reduce((acc, p) => acc + p.saldoPendiente, 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
