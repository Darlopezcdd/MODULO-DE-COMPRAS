'use client';

import React, { useState } from 'react';
import { FileText, Users, Calendar, Download } from 'lucide-react';

export default function ReportesPage() {
  const [generandoProv, setGenerandoProv] = useState(false);
  const [generandoCompras, setGenerandoCompras] = useState(false);
  const [filtroCompras, setFiltroCompras] = useState('todas'); // todas, dia, mes, anio
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  const descargarPdf = async (url: string, nombreArchivo: string, setCargando: (v: boolean) => void) => {
    if (generandoProv || generandoCompras) return;
    setCargando(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al generar PDF');
      
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error(e);
      alert("Hubo un error al generar el reporte en PDF.");
    } finally {
      setCargando(false);
    }
  };

  const handleReporteProveedores = () => {
    descargarPdf('/api/reportes/proveedores/pdf', 'Reporte_Proveedores.pdf', setGenerandoProv);
  };

  const handleReporteCompras = () => {
    const query = new URLSearchParams({
      tipo: filtroCompras,
      fecha: fechaFiltro
    }).toString();
    descargarPdf(`/api/reportes/compras/pdf?${query}`, `Reporte_Compras_${filtroCompras}.pdf`, setGenerandoCompras);
  };

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Generador de Reportes</h1>
          <p className="text-slate-500 mt-2">Descarga informes gerenciales en formato PDF con datos en tiempo real.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          
          {/* Reporte de Proveedores */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Directorio de Proveedores</h3>
            <p className="text-slate-500 mb-8 flex-1">
              Genera un documento PDF con la lista completa de todos los proveedores registrados, su información de contacto y su estado actual en el sistema.
            </p>
            <button
              onClick={handleReporteProveedores}
              disabled={generandoProv || generandoCompras}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {generandoProv ? (
                <span className="animate-pulse">Generando PDF...</span>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Descargar Reporte PDF
                </>
              )}
            </button>
          </div>

          {/* Reporte de Compras */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Reporte de Compras</h3>
            <p className="text-slate-500 mb-6">
              Genera un documento detallado de todas las facturas de compras realizadas, desglosado por el período que selecciones.
            </p>
            
            <div className="flex flex-col gap-4 w-full mb-8 flex-1 text-left">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Período del Reporte</label>
                <select 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50"
                  value={filtroCompras}
                  onChange={(e) => setFiltroCompras(e.target.value)}
                >
                  <option value="todas">Todas las compras (Histórico)</option>
                  <option value="dia">Compras del Día</option>
                  <option value="mes">Compras del Mes</option>
                  <option value="anio">Compras del Año</option>
                </select>
              </div>

              {filtroCompras !== 'todas' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Seleccionar Fecha de Referencia
                  </label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50"
                    value={fechaFiltro}
                    onChange={(e) => setFechaFiltro(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {filtroCompras === 'dia' && "Se buscarán las facturas de este día exacto."}
                    {filtroCompras === 'mes' && "Se buscarán las facturas de todo el mes de esta fecha."}
                    {filtroCompras === 'anio' && "Se buscarán las facturas de todo el año de esta fecha."}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleReporteCompras}
              disabled={generandoCompras || generandoProv}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {generandoCompras ? (
                <span className="animate-pulse">Generando PDF...</span>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Descargar Reporte PDF
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
