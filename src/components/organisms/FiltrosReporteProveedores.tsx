'use client';
// src/components/organisms/FiltrosReporteProveedores.tsx
// Organismo — Panel de filtros para el reporte de proveedores
// Atomic Design: combina selects (átomos) + botones institucionales UTN
// Paleta UTN: #003366 (azul principal), #4A90E2 (celeste secundario)

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
      style={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,51,102,0.15)' }}
    >
      {/* Título del panel */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,51,102,0.08)' }}
        >
          <Filter className="w-4 h-4" style={{ color: '#003366' }} />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#003366' }}>
          Filtros del Reporte
        </h2>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">

        {/* Filtro Estado */}
        <div className="flex-1 min-w-0">
          <label
            className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: '#003366' }}
          >
            Estado
          </label>
          <select
            value={estado}
            onChange={(e) => onEstadoChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2.5 rounded-xl border text-sm text-slate-800 bg-white outline-none transition-all
                       focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: 'rgba(0,51,102,0.20)',
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              '--tw-ring-color': '#003366',
            }}
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>

        {/* Filtro Tipo */}
        <div className="flex-1 min-w-0">
          <label
            className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: '#003366' }}
          >
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => onTipoChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2.5 rounded-xl border text-sm text-slate-800 bg-white outline-none transition-all
                       focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: 'rgba(0,51,102,0.20)' }}
          >
            <option value="">Todos los tipos</option>
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </select>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 shrink-0">
          {/* Botón Filtrar */}
          <button
            onClick={onFiltrar}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                       transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={{ backgroundColor: '#003366' }}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Cargando...' : 'Actualizar'}
          </button>

          {/* Botón Descargar PDF */}
          <button
            onClick={onDescargarPdf}
            disabled={isGenerandoPdf || isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                       transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={{ backgroundColor: '#4A90E2' }}
          >
            <Download className={`w-4 h-4 ${isGenerandoPdf ? 'animate-bounce' : ''}`} />
            {isGenerandoPdf ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
