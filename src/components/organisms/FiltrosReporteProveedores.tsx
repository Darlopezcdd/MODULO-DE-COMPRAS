'use client';
// src/components/organisms/FiltrosReporteProveedores.tsx
// Organismo — Panel de filtros para el reporte de proveedores
// Atomic Design: combina selects (átomos) + botones institucionales UTN
// Paleta UTN: #d20a11 (rojo principal), #706f6f (gris secundario)

import { Filter, Download, RefreshCw } from 'lucide-react';

interface FiltrosReporteProveedoresProps {
  estado: string;
  tipo: string;
  onEstadoChange: (v: string) => void;
  onTipoChange:   (v: string) => void;
  onFiltrar:      () => void;
  onDescargarPdf: () => void;
  isLoading:      boolean;
  isGenerandoPdf: boolean;
}

export default function FiltrosReporteProveedores({
  estado,
  tipo,
  onEstadoChange,
  onTipoChange,
  onFiltrar,
  onDescargarPdf,
  isLoading,
  isGenerandoPdf,
}: FiltrosReporteProveedoresProps) {
  return (
    <div
      className="rounded-2xl border p-5 shadow-sm"
      style={{ backgroundColor: '#ffffff', borderColor: 'rgba(210,10,17,0.15)' }}
    >
      {/* Título del panel */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'rgba(210,10,17,0.08)' }}
        >
          <Filter className="w-4 h-4" style={{ color: '#d20a11' }} />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#d20a11' }}>
          Filtros del Reporte
        </h2>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-4">

        {/* Filtro Estado */}
        <div className="flex-1">
          <label
            className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide"
          >
            Estado
          </label>
          <select
            value={estado}
            onChange={(e) => onEstadoChange(e.target.value)}
            disabled={isLoading}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer disabled:opacity-50"
            style={{ color: '#d20a11', '--tw-ring-color': '#d20a11' } as any}
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>

        {/* Filtro Tipo */}
        <div className="flex-1">
          <label
            className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide"
          >
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => onTipoChange(e.target.value)}
            disabled={isLoading}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer disabled:opacity-50"
            style={{ color: '#d20a11', '--tw-ring-color': '#d20a11' } as any}
          >
            <option value="">Todos los tipos</option>
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </select>
        </div>

        {/* Botones de acción */}
        <div className="flex items-end gap-3">
          {/* Botón Filtrar */}
          <button
            onClick={onFiltrar}
            disabled={isLoading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            style={{ backgroundColor: '#d20a11' }}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>

          {/* Botón Descargar PDF */}
          <button
            onClick={onDescargarPdf}
            disabled={isGenerandoPdf || isLoading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            style={{ backgroundColor: '#706f6f' }}
          >
            <Download className={`w-4 h-4 ${isGenerandoPdf ? 'animate-bounce' : ''}`} />
            {isGenerandoPdf ? 'Generando...' : 'PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
