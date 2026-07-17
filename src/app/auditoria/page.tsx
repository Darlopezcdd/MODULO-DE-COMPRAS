'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Search, Filter, Calendar, User, FileText, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface AuditoriaRegistro {
  id: string;
  fechaHora: string;
  usuarioId: number;
  usuarioNombre: string;
  accion: string;
  modulo: string;
  tablaAfectada: string;
  registroId: string | null;
  descripcion: string | null;
  resultado: string;
  ipAddress: string | null;
}

const ACCION_COLORS: Record<string, string> = {
  LOGIN: 'bg-emerald-100 text-emerald-700',
  LOGOUT: 'bg-slate-100 text-slate-700',
  CREAR: 'bg-blue-100 text-blue-700',
  ACTUALIZAR: 'bg-amber-100 text-amber-700',
  ELIMINAR: 'bg-red-100 text-red-700',
  IMPRIMIR: 'bg-purple-100 text-purple-700',
};

const ACCION_LABELS: Record<string, string> = {
  LOGIN: 'Inicio Sesión',
  LOGOUT: 'Cierre Sesión',
  CREAR: 'Creación',
  ACTUALIZAR: 'Actualización',
  ELIMINAR: 'Eliminación',
  IMPRIMIR: 'Impresión',
};

function formatearFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditoriaPage() {
  const [registros, setRegistros] = useState<AuditoriaRegistro[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroTabla, setFiltroTabla] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const LIMITE = 15;

  const cargarRegistros = useCallback(async (pag: number) => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ pagina: String(pag), limite: String(LIMITE) });
      if (filtroAccion) params.set('accion', filtroAccion);
      if (filtroUsuario) params.set('usuarioId', filtroUsuario);
      if (filtroTabla) params.set('tablaAfectada', filtroTabla);
      if (fechaInicio) params.set('fechaInicio', fechaInicio);
      if (fechaFin) params.set('fechaFin', fechaFin);

      const res = await fetch(`/api/auditoria?${params.toString()}`);
      let json: any;
      try {
        json = await res.json();
      } catch {
        const text = await res.text();
        throw new Error(`Respuesta inesperada del servidor (${res.status}): ${text.slice(0, 200)}`);
      }

      if (!res.ok) {
        throw new Error(json.error || `Error del servidor (${res.status})`);
      }

      setRegistros(json.data);
      setTotal(json.total);
      setTotalPaginas(json.totalPaginas);
      setPagina(json.pagina);
    } catch (e: any) {
      setError(e.message || 'Error al cargar el historial de auditoría');
      setRegistros([]);
    } finally {
      setIsLoading(false);
    }
  }, [filtroAccion, filtroUsuario, filtroTabla, fechaInicio, fechaFin]);

  useEffect(() => {
    cargarRegistros(1);
    
  }, []);

  const handleFiltrar = () => {
    cargarRegistros(1);
  };

  const handleLimpiar = () => {
    setFiltroAccion('');
    setFiltroUsuario('');
    setFiltroTabla('');
    setFechaInicio('');
    setFechaFin('');
    setPagina(1);
    cargarRegistros(1);
  };

  const exportarCSV = () => {
    const headers = ['ID', 'Fecha/Hora', 'Usuario', 'Acción', 'Módulo', 'Tabla', 'RegistroID', 'Descripción', 'Resultado'];
    const rows = registros.map(r => [
      r.id,
      r.fechaHora,
      r.usuarioNombre,
      r.accion,
      r.modulo,
      r.tablaAfectada,
      r.registroId || '',
      r.descripcion || '',
      r.resultado,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-[#d10a11]">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: '#d10a11' }}>
                Pistas de Auditoría
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Universidad Técnica del Norte — Sistema de Compras
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Filtros</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Acción</label>
              <select
                value={filtroAccion}
                onChange={(e) => setFiltroAccion(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#d10a11]/30 focus:border-[#d10a11]"
              >
                <option value="">Todas</option>
                <option value="LOGIN">Inicio Sesión</option>
                <option value="LOGOUT">Cierre Sesión</option>
                <option value="CREAR">Creación</option>
                <option value="ACTUALIZAR">Actualización</option>
                <option value="ELIMINAR">Eliminación</option>
                <option value="IMPRIMIR">Impresión</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Usuario ID</label>
              <input
                type="number"
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
                placeholder="Ej: 1"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#d10a11]/30 focus:border-[#d10a11]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tabla Afectada</label>
              <input
                type="text"
                value={filtroTabla}
                onChange={(e) => setFiltroTabla(e.target.value)}
                placeholder="Ej: proveedor"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#d10a11]/30 focus:border-[#d10a11]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#d10a11]/30 focus:border-[#d10a11]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#d10a11]/30 focus:border-[#d10a11]"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleFiltrar}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#d10a11] hover:bg-[#b0090e] text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              Buscar
            </button>
            <button
              onClick={handleLimpiar}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Limpiar
            </button>
            {registros.length > 0 && (
              <button
                onClick={exportarCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors ml-auto"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha/Hora</th>
                  <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                  <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
                  <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tabla</th>
                  <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Registro</th>
                  <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</th>
                  <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-[#d10a11]/30 border-t-[#d10a11] rounded-full animate-spin" />
                        <p className="text-sm">Cargando registros de auditoría...</p>
                      </div>
                    </td>
                  </tr>
                ) : registros.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No se encontraron registros de auditoría</p>
                      <p className="text-sm mt-1">Prueba ajustando los filtros o realiza alguna acción en el sistema.</p>
                    </td>
                  </tr>
                ) : (
                  registros.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-sm text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {formatearFecha(r.fechaHora)}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800">{r.usuarioNombre}</span>
                          <span className="text-xs text-slate-400">#{r.usuarioId}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${ACCION_COLORS[r.accion] || 'bg-slate-100 text-slate-700'}`}>
                          {ACCION_LABELS[r.accion] || r.accion}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-600">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{r.tablaAfectada}</span>
                      </td>
                      <td className="p-3 text-sm text-slate-600 font-mono">
                        {r.registroId || '—'}
                      </td>
                      <td className="p-3 text-sm text-slate-600 max-w-xs truncate" title={r.descripcion || ''}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{r.descripcion || '—'}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${r.resultado === 'EXITOSO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {r.resultado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-sm text-slate-500">
              Página {pagina} de {totalPaginas} ({total} registros)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => cargarRegistros(pagina - 1)}
                disabled={pagina <= 1 || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-slate-700 transition-colors shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPaginas, 7) }, (_, i) => {
                  let pagNum: number;
                  if (totalPaginas <= 7) {
                    pagNum = i + 1;
                  } else if (pagina <= 4) {
                    pagNum = i + 1;
                  } else if (pagina >= totalPaginas - 3) {
                    pagNum = totalPaginas - 6 + i;
                  } else {
                    pagNum = pagina - 3 + i;
                  }
                  return (
                    <button
                      key={pagNum}
                      onClick={() => cargarRegistros(pagNum)}
                      disabled={isLoading}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                        pagina === pagNum
                          ? 'bg-[#d10a11] text-white border border-[#d10a11]'
                          : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {pagNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => cargarRegistros(pagina + 1)}
                disabled={pagina >= totalPaginas || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-slate-700 transition-colors shadow-sm"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
