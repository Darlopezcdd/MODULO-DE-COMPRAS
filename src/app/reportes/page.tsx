'use client';
// src/app/reportes/page.tsx
// Página — Reportes del Módulo de Compras UTN
// Atomic Design: Page = Template + Organisms + Molecules + Atoms
// Paleta UTN: #d20a11 | #706f6f | #E5E5E5 | #E65100 | #FFFFFF

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Users, TrendingUp, TrendingDown, Building2, Calendar, Download } from 'lucide-react';
import SearchInput from '@/components/SearchInput';
import { useDebounce } from '@/hooks/useDebounce';

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
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [proveedores, setProveedores] = useState<ProveedorReporteData[] | null>(null);
  const [stats, setStats] = useState({ total: 0, activos: 0, inactivos: 0 });
  const [isLoadingProv, setIsLoadingProv] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  // ── Paginación ─────────────────────────────────────────────────────────
  const ITEMS_POR_PAGINA = 10;
  const [paginaActualProv, setPaginaActualProv] = useState(1);
  const [paginaActualFact, setPaginaActualFact] = useState(1);

  // ── Estado tab Facturas ───────────────────────────────────────────────────
  const [facturas, setFacturas] = useState<FacturaReporteData[] | null>(null);
  const [filtroFacturas, setFiltroFacturas] = useState({ fechaInicio: '', fechaFin: '' });
  const [isLoadingFact, setIsLoadingFact] = useState(false);
  const [generandoCompras, setGenerandoCompras] = useState(false);
const [msgId, setMsgId] = useState<string | null>(null);
const [reporteEnProceso, setReporteEnProceso] = useState(false);
const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // ── Búsqueda con debounce ──────────────────────────────────────────────────
  const [busquedaProv, setBusquedaProv] = useState('');
  const debouncedBusquedaProv = useDebounce(busquedaProv, 400);
  const [busquedaFact, setBusquedaFact] = useState('');
  const debouncedBusquedaFact = useDebounce(busquedaFact, 400);

  // ── Cargar proveedores ────────────────────────────────────────────────────
  const cargarProveedores = useCallback(async () => {
    setIsLoadingProv(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroTipo) params.set('tipo', filtroTipo);

      const res = await fetch(`/api/reportes/proveedores/json?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setProveedores(json.data);
        setStats({ total: json.total, activos: json.activos, inactivos: json.inactivos });
      }
    } catch (e) {
      console.error('Error al cargar proveedores:', e);
      setPaginaActualProv(1);
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
      if (filtroTipo) params.set('tipo', filtroTipo);

      const res = await fetch(`/api/reportes/proveedores?${params.toString()}`);
      if (!res.ok) throw new Error('Error al generar PDF');

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `Reporte_Proveedores_${new Date().toISOString().split('T')[0]}.pdf`;
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
  const handleGenerarReporteFacturas = useCallback(async ({ fechaInicio, fechaFin }: { fechaInicio: string; fechaFin: string }) => {
    setIsLoadingFact(true);
    setFiltroFacturas({ fechaInicio, fechaFin });
    try {
      const params = new URLSearchParams({ fechaInicio, fechaFin });
      const res = await fetch(`/api/reportes/facturas?${params.toString()}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        // Mapear campos de la API al tipo FacturaReporteData
        const mapped: FacturaReporteData[] = json.data.map((f: any) => ({
          id: String(f.id),
          numero: f.numero_factura ?? f.numeroFactura ?? `FC-${f.id}`,
          fechaEmision: f.fecha
            ? (typeof f.fecha === 'string' ? f.fecha.split('T')[0] : new Date(f.fecha).toISOString().split('T')[0])
            : '',
          proveedor: f.proveedor_nombre ?? f.proveedorNombre ?? 'Proveedor',
          tipoPago: (f.tipo_pago ?? f.tipoPago ?? 'CONTADO') as 'CONTADO' | 'CREDITO',
          subtotal: Number(f.subtotal_sin_iva ?? f.subtotalSinIva ?? 0) + Number(f.subtotal_con_iva ?? f.subtotalConIva ?? 0),
          iva: Number(f.total_iva ?? f.totalIva ?? 0),
          total: Number(f.total ?? 0),
        }));
        setFacturas(mapped);
        setPaginaActualFact(1);
      } else {
        setFacturas([]);
      }
    } catch (e) {
      console.error('Error al cargar facturas:', e);
      setFacturas([]);
    } finally {
      setIsLoadingFact(false);
    }
  }, []);

  useEffect(() => {
    if (tabActivo === 'facturas' && facturas === null) {
      const hoy = new Date().toISOString().split('T')[0];
      handleGenerarReporteFacturas({ fechaInicio: hoy, fechaFin: hoy });
    }
  }, [tabActivo, facturas, handleGenerarReporteFacturas]);


  // ── Solicitar reporte PDF asíncrono ───────────────────────────────────────
  const solicitarReporteAsync = async () => {
    setGenerandoCompras(true);
    try {
      const params = new URLSearchParams();
      if (filtroFacturas.fechaInicio) params.set('fechaInicio', filtroFacturas.fechaInicio);
      if (filtroFacturas.fechaFin) params.set('fechaFin', filtroFacturas.fechaFin);

      const payload = {
        tipoReporte: 'REPORTE_COMPRAS',
        filtros: {
          fechaInicio: filtroFacturas.fechaInicio,
          fechaFin: filtroFacturas.fechaFin,
        },
        emailDestino: 'hidalgoesau27@gmail.com',
      };

      const res = await fetch('/api/reportes/compras/async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMsgId(data.sqsMessageId);
      setReporteEnProceso(true);
      alert('El reporte está en proceso. Lo recibirás por correo en breve.');
    } catch {
      alert('Hubo un error al solicitar el reporte.');
    } finally {
      setGenerandoCompras(false);
    }
  };

  // ── Polling de estado del reporte ───────────────────────────────────────
  useEffect(() => {
    if (!reporteEnProceso || !msgId) return;
    const interval = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/reportes/compras/status?msgId=${msgId}`);
        const statusData = await statusRes.json();
        if (statusData.status === 'COMPLETED') {
          clearInterval(interval);
          setReporteEnProceso(false);
          setDownloadUrl(statusData.downloadUrl);
        }
      } catch (e) {
        console.error('Error al consultar el estado del reporte', e);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [reporteEnProceso, msgId]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: '#f8fafc' }}>
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── Header institucional UTN ──────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: '#d20a11' }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: '#d20a11' }}>
                Reportes
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
                ? { backgroundColor: '#d20a11', color: '#ffffff', boxShadow: '0 2px 8px rgba(209,10,17,0.25)' }
                : { color: '#d20a11', backgroundColor: 'transparent' }
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
                ? { backgroundColor: '#d20a11', color: '#ffffff', boxShadow: '0 2px 8px rgba(209,10,17,0.25)' }
                : { color: '#d20a11', backgroundColor: 'transparent' }
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
                color="#d20a11"
                bgColor="rgba(209,10,17,0.08)"
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

            {/* Buscador avanzado (HU11 — Aldahir Requene) */}
            <SearchInput
              placeholder="Buscar proveedores por nombre, ciudad o estado..."
              onSearch={setBusquedaProv}
              className="max-w-md"
            />

            {/* Tabla de proveedores (Molécula) — filtrada por búsqueda */}
            <TablaProveedores
              data={proveedores ? (() => {
                const filtered = debouncedBusquedaProv
                  ? proveedores.filter(p =>
                      p.nombre?.toLowerCase().includes(debouncedBusquedaProv.toLowerCase()) ||
                      p.ciudad?.toLowerCase().includes(debouncedBusquedaProv.toLowerCase()) ||
                      p.estado?.toLowerCase().includes(debouncedBusquedaProv.toLowerCase())
                    )
                  : proveedores;
                return filtered.slice((paginaActualProv - 1) * ITEMS_POR_PAGINA, paginaActualProv * ITEMS_POR_PAGINA);
              })() : proveedores}
              isLoading={isLoadingProv}
            />

            {proveedores && proveedores.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-sm text-slate-500">
                  Mostrando {(paginaActualProv - 1) * ITEMS_POR_PAGINA + 1} a {Math.min(paginaActualProv * ITEMS_POR_PAGINA, proveedores.length)} de {proveedores.length} registros
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPaginaActualProv(p => Math.max(1, p - 1))}
                    disabled={paginaActualProv === 1}
                    className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-slate-700 transition-colors shadow-sm"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(proveedores.length / ITEMS_POR_PAGINA) }, (_, i) => i + 1).map(pag => (
                      <button
                        key={pag}
                        onClick={() => setPaginaActualProv(pag)}
                        className={`w-8 h-8 rounded text-sm transition-colors shadow-sm ${paginaActualProv === pag ? 'bg-blue-600 text-white font-bold border border-blue-600' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                      >
                        {pag}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setPaginaActualProv(p => Math.min(Math.ceil(proveedores.length / ITEMS_POR_PAGINA), p + 1))}
                    disabled={paginaActualProv === Math.ceil(proveedores.length / ITEMS_POR_PAGINA) || Math.ceil(proveedores.length / ITEMS_POR_PAGINA) === 0}
                    className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-slate-700 transition-colors shadow-sm"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
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
                    style={{ backgroundColor: 'rgba(112,111,111,0.10)' }}
                  >
                    <Calendar className="w-5 h-5" style={{ color: '#706f6f' }} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: '#d20a11' }}>
                      Reporte de Facturas de Compra
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Selecciona el rango de fechas para consultar las facturas
                    </p>
                  </div>
                </div>

                {/* Botón PDF de compras */}
                {facturas && facturas.length > 0 && (
                  <div className="flex gap-2">
                    {!downloadUrl && (
                      <button
                        onClick={solicitarReporteAsync}
                        disabled={generandoCompras || reporteEnProceso}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                                   transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                        style={{ backgroundColor: '#706f6f' }}
                      >
                        <Download className="w-4 h-4" />
                        {generandoCompras || reporteEnProceso ? 'En proceso...' : 'Solicitar PDF'}
                      </button>
                    )}
                    {downloadUrl && (
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = downloadUrl;
                          a.target = '_blank';
                          a.click();
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                                   transition-all shadow-sm hover:shadow-md"
                        style={{ backgroundColor: '#10b981' }}
                      >
                        <Download className="w-4 h-4" />
                        Descargar / Imprimir
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Filtro de fechas (componente existente de Jairo) */}
            <ReportesFiltros
              onGenerarReporte={handleGenerarReporteFacturas}
              isLoading={isLoadingFact}
            />

            {/* Buscador avanzado facturas (HU11 — Aldahir Requene) */}
            <SearchInput
              placeholder="Buscar facturas por número o proveedor..."
              onSearch={setBusquedaFact}
              className="max-w-md"
            />

            {/* Tabla de facturas (componente existente de Aldahir) — filtrada */}
            <ReportesTabla
              data={facturas ? (() => {
                const filtered = debouncedBusquedaFact
                  ? facturas.filter(f =>
                      f.numero?.toLowerCase().includes(debouncedBusquedaFact.toLowerCase()) ||
                      f.proveedor?.toLowerCase().includes(debouncedBusquedaFact.toLowerCase())
                    )
                  : facturas;
                return filtered.slice((paginaActualFact - 1) * ITEMS_POR_PAGINA, paginaActualFact * ITEMS_POR_PAGINA);
              })() : facturas}
              isLoading={isLoadingFact}
            />

            {facturas && facturas.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-sm text-slate-500">
                  Mostrando {(paginaActualFact - 1) * ITEMS_POR_PAGINA + 1} a {Math.min(paginaActualFact * ITEMS_POR_PAGINA, facturas.length)} de {facturas.length} registros
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPaginaActualFact(p => Math.max(1, p - 1))}
                    disabled={paginaActualFact === 1}
                    className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-slate-700 transition-colors shadow-sm"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(facturas.length / ITEMS_POR_PAGINA) }, (_, i) => i + 1).map(pag => (
                      <button
                        key={pag}
                        onClick={() => setPaginaActualFact(pag)}
                        className={`w-8 h-8 rounded text-sm transition-colors shadow-sm ${paginaActualFact === pag ? 'bg-blue-600 text-white font-bold border border-blue-600' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                      >
                        {pag}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setPaginaActualFact(p => Math.min(Math.ceil(facturas.length / ITEMS_POR_PAGINA), p + 1))}
                    disabled={paginaActualFact === Math.ceil(facturas.length / ITEMS_POR_PAGINA) || Math.ceil(facturas.length / ITEMS_POR_PAGINA) === 0}
                    className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-slate-700 transition-colors shadow-sm"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
