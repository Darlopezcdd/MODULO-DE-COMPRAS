'use client';
// src/app/reportes/facturas/page.tsx
// HU6 — Reporte de facturas (Integración UI de Tareas de Aldahir Requene)

import React, { useState } from 'react';
import ReportesFiltros, { FiltroFechasPayload } from '@/components/ReportesFiltros';
import ReportesTabla, { FacturaReporteData } from '@/components/ReportesTabla';

export default function ReporteFacturasPage() {
  const [reporteData, setReporteData] = useState<FacturaReporteData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Simulación del endpoint de Darío López ───────────────────────────────────
  const mockFetchReporte = async (payload: FiltroFechasPayload) => {
    setIsLoading(true);
    
    // Simulamos un retraso de red de 1.5s
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Si la fecha de inicio es igual a la de fin y es el día 15, simulamos "Vacío"
    if (payload.fechaInicio === payload.fechaFin && payload.fechaInicio.endsWith('-15')) {
      setReporteData([]);
      setIsLoading(false);
      return;
    }

    // Mock Payload Mapeado (Dario enviará esto)
    const mockData: FacturaReporteData[] = [
      { id: '1', numero: '001-002-0000123', fechaEmision: payload.fechaInicio, proveedor: 'Importadora ABC S.A.', tipoPago: 'CREDITO', subtotal: 1000, iva: 150, total: 1150 },
      { id: '2', numero: '001-002-0000124', fechaEmision: payload.fechaInicio, proveedor: 'Distribuidora XYZ', tipoPago: 'CONTADO', subtotal: 500, iva: 75, total: 575 },
      { id: '3', numero: '001-002-0000125', fechaEmision: payload.fechaFin, proveedor: 'Comercializadora Nacional', tipoPago: 'CREDITO', subtotal: 2500, iva: 375, total: 2875 },
    ];

    setReporteData(mockData);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Reporte de Facturas de Compra
          </h1>
          <p className="text-slate-400 mt-1">
            Módulo de consulta gerencial para el análisis de compras a proveedores por período.
          </p>
        </div>

        {/* 1. Componente DatePicker y Payload (Aldahir) */}
        <ReportesFiltros 
          onGenerarReporte={mockFetchReporte} 
          isLoading={isLoading} 
        />

        {/* 2. Componente de Tabla, Estados Vacíos y JSON Mapping (Aldahir) */}
        <ReportesTabla 
          data={reporteData} 
          isLoading={isLoading} 
        />

      </div>
    </div>
  );
}
