'use client';
// src/components/ReportesFiltros.tsx
// HU6 — Diseño de DatePicker y payload de validación (Tarea: Aldahir Requene)

import React, { useState } from 'react';

export interface FiltroFechasPayload {
  fechaInicio: string;
  fechaFin: string;
}

interface ReportesFiltrosProps {
  onGenerarReporte: (payload: FiltroFechasPayload) => void;
  isLoading: boolean;
}

export default function ReportesFiltros({ onGenerarReporte, isLoading }: ReportesFiltrosProps) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerar = () => {
    setError(null);

    // Validaciones
    if (!fechaInicio || !fechaFin) {
      setError('Por favor, selecciona ambas fechas.');
      return;
    }

    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    const hoy = new Date();

    if (start > end) {
      setError('La fecha de inicio no puede ser mayor a la fecha de fin.');
      return;
    }

    if (start > hoy || end > hoy) {
      setError('No puedes generar reportes de fechas futuras.');
      return;
    }

    // Si pasa validaciones, emitimos el payload
    onGenerarReporte({ fechaInicio, fechaFin });
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="relative z-10">
        <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <span className="text-blue-600">📅</span> Rango del Reporte
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Selecciona el rango de fechas para generar el reporte de facturas.
        </p>

        <div className="flex flex-col md:flex-row items-end gap-6">
          
          {/* DatePicker Inicio */}
          <div className="flex-1 w-full relative">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              max={new Date().toISOString().split('T')[0]} // Bloquea futuro en UI
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all custom-datepicker"
            />
          </div>

          {/* DatePicker Fin */}
          <div className="flex-1 w-full relative">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Fecha de Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio} // Bloquea menores a inicio en UI
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all custom-datepicker"
            />
          </div>

          {/* Botón de Acción */}
          <div className="w-full md:w-auto">
            <button
              onClick={handleGenerar}
              disabled={isLoading}
              className={`w-full md:w-auto px-8 py-3 rounded-xl font-medium transition-all shadow-sm flex items-center justify-center gap-2 ${
                isLoading 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <span>📊</span> Generar Reporte
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>

      {/* Estilos para ocultar el feo icono nativo del calendario en algunos navegadores y hacer que toda el area sea clicable */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-datepicker::-webkit-calendar-picker-indicator {
          background-color: transparent;
          cursor: pointer;
          opacity: 0.6;
        }
        .custom-datepicker::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
      `}} />
    </div>
  );
}
