'use client';
// src/app/reportes/page.tsx
// Página — Reportes del Módulo de Compras UTN
// Atomic Design: Page = Template + Organisms + Molecules + Atoms
// Paleta UTN: #003366 | #4A90E2 | #E5E5E5 | #E65100 | #FFFFFF

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Users, TrendingUp, TrendingDown, Building2, Calendar, Download } from 'lucide-react';

// ── Organismos ────────────────────────────────────────────────────────────────
import FiltrosReporteProveedores from '@/components/organisms/FiltrosReporteProveedores';

// ── Moléculas ─────────────────────────────────────────────────────────────────
import TablaProveedores, { ProveedorReporteData } from '@/components/molecules/TablaProveedores';
import ReportesFiltros from '@/components/ReportesFiltros';
import ReportesTabla, { FacturaReporteData } from '@/components/ReportesTabla';

// ── Tipos de tabs ─────────────────────────────────────────────────────────────
type Tab = 'proveedores' | 'facturas';

// ── Tarjeta estadística (átomo inline) ───────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm p-5 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: bgColor }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-black mt-0.5" style={{ color }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ReportesPage() {
  // ── Estado activo de tab ──────────────────────────────────────────────────
  const [tabActivo, setTabActivo] = useState<Tab>('proveedores');

  // ── Estado tab Proveedores ────────────────────────────────────────────────
  const [filtroEstado, setFiltroEstado]   = useState('');
  const [filtroTipo, setFiltroTipo]       = useState('');
  const [proveedores, setProveedores]     = useState<ProveedorReporteData[] | null>(null);
  const [stats, setStats]                 = useState({ total: 0, activos: 0, inactivos: 0 });
  const [isLoadingProv, setIsLoadingProv] = useState(false);
  const [generandoPdf, setGenerandoPdf]   = useState(false);

  // ── Estado tab Facturas ───────────────────────────────────────────────────
  const [facturas, setFacturas]           = useState<FacturaReporteData[] | null>(null);
  const [isLoadingFact, setIsLoadingFact] = useState(false);
  const [generandoCompras, setGenerandoCompras] = useState(false);

  // ── Cargar proveedores ────────────────────────────────────────────────────
  const cargarProveedores = useCallback(async () => {
    setIsLoadingProv(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroTipo)   params.set('tipo',   filtroTipo);

      const res  = await fetch(`/api/reportes/proveedores/json?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setProveedores(json.data);
        setStats({ total: json.total, activos: json.activos, inactivos: json.inactivos });
      }
    } catch (e) {
      console.error('Error al cargar proveedores:', e);
    } finally {
      setIsLoadingProv(false);
    }
  }, [filtroEstado, filtroTipo]);

  // Cargar al montar la página
  useEffect(() => {
    cargarProveedores();
  }, [cargarProveedores]);

  // ── Descargar PDF proveedores ─────────────────────────────────────────────
  const descargarPdfProveedores = async () => {
    setGenerandoPdf(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroTipo)   params.set('tipo',   filtroTipo);

      const res = await fetch(`/api/reportes/proveedores?${params.toString()}`);
      if (!res.ok) throw new Error('Error al generar PDF');

      const blob      = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a         = document.createElement('a');
      a.href          = objectUrl;
      a.download      = `Reporte_Proveedores_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      alert('Hubo un error al generar el reporte en PDF.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  // ── Cargar facturas por rango de fechas ───────────────────────────────────
  const handleGenerarReporteFacturas = async ({ fechaInicio, fechaFin }: { fechaInicio: string; fechaFin: string }) => {
    setIsLoadingFact(true);
    try {
      const params = new URLSearchParams({ fechaInicio, fechaFin });
      const res    = await fetch(`/api/reportes/facturas?${params.toString()}`);
      const json   = await res.json();

      if (json.success && Array.isArray(json.data)) {
        // Mapear campos de la API al tipo FacturaReporteData
        const mapped: FacturaReporteData[] = json.data.map((f: any) => ({
          id:           String(f.id),
          numero:       f.numero_factura ?? f.numeroFactura ?? `FC-${f.id}`,
          fechaEmision: f.fecha
            ? (typeof f.fecha === 'string' ? f.fecha.split('T')[0] : new Date(f.fecha).toISOString().split('T')[0])
            : '',
          proveedor:    f.proveedor_nombre ?? f.proveedorNombre ?? 'Proveedor',
          tipoPago:     (f.tipo_pago ?? f.tipoPago ?? 'CONTADO') as 'CONTADO' | 'CREDITO',
          subtotal:     Number(f.subtotal_sin_iva ?? f.subtotalSinIva ?? 0) + Number(f.subtotal_con_iva ?? f.subtotalConIva ?? 0),
          iva:          Number(f.total_iva ?? f.totalIva ?? 0),
          total:        Number(f.total ?? 0),
        }));
        setFacturas(mapped);
      } else {
        setFacturas([]);
      }
    } catch (e) {
      console.error('Error al cargar facturas:', e);
      setFacturas([]);
    } finally {
      setIsLoadingFact(false);
    }
  };


  // ── Descargar PDF facturas ────────────────────────────────────────────────
  const descargarPdfFacturas = async () => {
    setGenerandoCompras(true);
    try {
      const res = await fetch('/api/reportes/compras/pdf');
      if (!res.ok) throw new Error();
      const blob      = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a         = document.createElement('a');
      a.href          = objectUrl;
      a.download      = `Reporte_Facturas_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      alert('Hubo un error al generar el PDF de facturas.');
    } finally {
      setGenerandoCompras(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: '#f8fafc' }}>
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── Header institucional UTN ──────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: '#003366' }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: '#003366' }}>
                Módulo de Reportes
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Universidad Técnica del Norte — Sistema de Compras
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabs de navegación ────────────────────────────────────────────── */}
        <div
          className="flex gap-1 p-1 rounded-2xl mb-8 w-fit"
          style={{ backgroundColor: '#E5E5E5' }}
        >
          <button
            onClick={() => setTabActivo('proveedores')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={
              tabActivo === 'proveedores'
                ? { backgroundColor: '#003366', color: '#ffffff', boxShadow: '0 2px 8px rgba(0,51,102,0.25)' }
                : { color: '#003366', backgroundColor: 'transparent' }
            }
          >
            <Users className="w-4 h-4" />
            Proveedores
          </button>
          <button
            onClick={() => setTabActivo('facturas')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={
              tabActivo === 'facturas'
                ? { backgroundColor: '#003366', color: '#ffffff', boxShadow: '0 2px 8px rgba(0,51,102,0.25)' }
                : { color: '#003366', backgroundColor: 'transparent' }
            }
          >
            <FileText className="w-4 h-4" />
            Facturas
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            TAB: PROVEEDORES
        ════════════════════════════════════════════════════════════════════ */}
        {tabActivo === 'proveedores' && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={Building2}
                label="Total Proveedores"
                value={stats.total}
                color="#003366"
                bgColor="rgba(0,51,102,0.08)"
              />
              <StatCard
                icon={TrendingUp}
                label="Activos"
                value={stats.activos}
                color="#16a34a"
                bgColor="rgba(22,163,74,0.08)"
              />
              <StatCard
                icon={TrendingDown}
                label="Inactivos"
                value={stats.inactivos}
                color="#E65100"
                bgColor="rgba(230,81,0,0.08)"
              />
            </div>

            {/* Panel de filtros (Organismo) */}
            <FiltrosReporteProveedores
              estado={filtroEstado}
              tipo={filtroTipo}
              onEstadoChange={setFiltroEstado}
              onTipoChange={setFiltroTipo}
              onFiltrar={cargarProveedores}
              onDescargarPdf={descargarPdfProveedores}
              isLoading={isLoadingProv}
              isGenerandoPdf={generandoPdf}
            />

            {/* Tabla de proveedores (Molécula) */}
            <TablaProveedores
              data={proveedores}
              isLoading={isLoadingProv}
            />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB: FACTURAS
        ════════════════════════════════════════════════════════════════════ */}
        {tabActivo === 'facturas' && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Header de sección */}
            <div
              className="rounded-2xl border p-5 shadow-sm"
              style={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,51,102,0.15)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(74,144,226,0.10)' }}
                  >
                    <Calendar className="w-5 h-5" style={{ color: '#4A90E2' }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: '#003366' }}>
                      Reporte de Facturas de Compra
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Selecciona el rango de fechas para consultar las facturas
                    </p>
                  </div>
                </div>

                {/* Botón PDF de compras */}
                {facturas && facturas.length > 0 && (
                  <button
                    onClick={descargarPdfFacturas}
                    disabled={generandoCompras}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                               transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                    style={{ backgroundColor: '#4A90E2' }}
                  >
                    <Download className="w-4 h-4" />
                    {generandoCompras ? 'Generando...' : 'Descargar PDF'}
                  </button>
                )}
              </div>
            </div>

            {/* Filtro de fechas (componente existente de Jairo) */}
            <ReportesFiltros
              onGenerarReporte={handleGenerarReporteFacturas}
              isLoading={isLoadingFact}
            />

            {/* Tabla de facturas (componente existente de Aldahir) */}
            <ReportesTabla
              data={facturas}
              isLoading={isLoadingFact}
            />
          </div>
        )}

      </div>
    </div>
  );
}
