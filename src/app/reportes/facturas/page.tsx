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
  const fetchReporte = async (payload: FiltroFechasPayload) => {
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query ReporteFacturas($fechaInicio: String, $fechaFin: String) {
              listarFacturas(fechaInicio: $fechaInicio, fechaFin: $fechaFin) {
                id
                numeroFactura
                fecha
                proveedorNombre
                tipoPago
                subtotalSinIva
                subtotalConIva
                totalIva
                total
              }
            }
          `,
          variables: {
            fechaInicio: payload.fechaInicio,
            fechaFin: payload.fechaFin
          }
        })
      });
      const data = await res.json();
      
      if (data.data?.listarFacturas) {
        const mappedData: FacturaReporteData[] = data.data.listarFacturas.map((f: any) => ({
          id: String(f.id),
          numero: f.numeroFactura,
          fechaEmision: f.fecha,
          proveedor: f.proveedorNombre,
          tipoPago: f.tipoPago,
          subtotal: f.subtotalSinIva + f.subtotalConIva,
          iva: f.totalIva,
          total: f.total
        }));
        setReporteData(mappedData);
      } else {
        setReporteData([]);
      }
    } catch (e) {
      console.error(e);
      setReporteData([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Reporte de Facturas de Compra
          </h1>
          <p className="text-slate-500 mt-1">
            Módulo de consulta gerencial para el análisis de compras a proveedores por período.
          </p>
        </div>

        {/* 1. Componente DatePicker y Payload */}
        <ReportesFiltros 
          onGenerarReporte={fetchReporte} 
          isLoading={isLoading} 
        />

        {/* 2. Componente de Tabla, Estados Vacíos y JSON Mapping */}
        <ReportesTabla 
          data={reporteData} 
          isLoading={isLoading} 
        />

      </div>
    </div>
  );
}
