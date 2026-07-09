'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';

interface Factura {
  id: number;
  numeroFactura: string;
  fecha: string;
  tipoPago: string;
  total: number;
  estado: string;
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [user, setUser] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Revisar si venimos redirigidos con un ID de factura para previsualizar
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const previewId = params.get('preview');
      if (previewId) {
        setPreviewUrl(`/api/facturas/${previewId}/pdf`);
        // Limpiar la URL para evitar que se abra de nuevo si el usuario recarga la página
        window.history.replaceState({}, '', '/facturas');
      }
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.usuario) setUser(data.usuario);
      })
      .catch(console.error);
  }, []);

  const fetchFacturas = async () => {
    try {
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query Listar($estado: EstadoFactura) {
              listarFacturas(estado: $estado) {
                id
                numeroFactura
                fecha
                tipoPago
                total
                estado
              }
            }
          `,
          variables: {
            estado: filtroEstado || null,
          },
        }),
      });
      const data = await res.json();
      if (data.data?.listarFacturas) {
        setFacturas(data.data.listarFacturas);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFacturas = facturas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(facturas.length / itemsPerPage));

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Facturas de Compra</h1>
          {user?.permisos?.crear_facturas && (
            <Link href="/facturas/nueva" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
              + Nueva Factura
            </Link>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl flex gap-4 items-center border border-slate-200 shadow-sm">
          <span className="text-sm font-semibold text-slate-600">Filtros:</span>
          <select 
            className="bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="EMITIDA">Emitida</option>
            <option value="ANULADA">Anulada</option>
          </select>
        </div>

        <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">Número</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Fecha</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Tipo de Pago</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">Total</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentFacturas.map(f => (
                <tr 
                  key={f.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setPreviewUrl(`/api/facturas/${f.id}/pdf`)}
                >
                  <td className="p-4 font-mono text-sm text-blue-600">{f.numeroFactura || 'S/N'}</td>
                  <td className="p-4 text-slate-500">{f.fecha}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${f.tipoPago === 'CREDITO' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {f.tipoPago}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-emerald-600 font-medium">
                    ${f.total?.toFixed(2)}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      f.estado === 'EMITIDA' ? 'bg-blue-100 text-blue-700' : 
                      f.estado === 'ANULADA' ? 'bg-red-100 text-red-700' : 
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {f.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {facturas.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No se encontraron facturas registradas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {facturas.length > 0 && (
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-sm text-slate-600">
              Mostrando <span className="font-semibold text-slate-900">{indexOfFirstItem + 1}</span> a <span className="font-semibold text-slate-900">{Math.min(indexOfLastItem, facturas.length)}</span> de <span className="font-semibold text-slate-900">{facturas.length}</span> facturas
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Anterior
              </button>
              <div className="flex items-center px-2 text-sm font-medium text-slate-600">
                Página {currentPage} de {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Previsualización PDF */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header del Modal */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Vista Previa de Factura</h3>
                  <p className="text-xs text-slate-500">Documento PDF</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewUrl(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            {/* Contenido del Modal */}
            <div className="flex-1 bg-slate-100/50 relative overflow-hidden">
              <div className="w-full h-full p-2 sm:p-6 bg-slate-200/50">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border border-slate-200 shadow-lg rounded-xl bg-white"
                  title="Previsualización PDF"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
