'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Eye } from 'lucide-react';

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
  const [paginaActual, setPaginaActual] = useState(1);
  const [user, setUser] = useState<any>(null);
  const ITEMS_POR_PAGINA = 10;

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
    setPaginaActual(1);
    fetchFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

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
                <th className="p-4 text-sm font-semibold text-slate-600 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facturas
                .slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA)
                .map(f => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
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
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => window.open(`/api/facturas/${f.id}/pdf`, '_blank')}
                      className="text-slate-400 hover:text-blue-600 transition-colors p-2"
                      title="Previsualizar PDF"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {facturas.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No se encontraron facturas registradas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {facturas.length > 0 && (
          <div className="flex items-center justify-between mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-sm text-slate-500">
              Mostrando {(paginaActual - 1) * ITEMS_POR_PAGINA + 1} a {Math.min(paginaActual * ITEMS_POR_PAGINA, facturas.length)} de {facturas.length} facturas
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-slate-700 transition-colors shadow-sm"
              >
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(facturas.length / ITEMS_POR_PAGINA) }, (_, i) => i + 1).map(pag => (
                  <button
                    key={pag}
                    onClick={() => setPaginaActual(pag)}
                    className={`w-8 h-8 rounded text-sm transition-colors shadow-sm ${paginaActual === pag ? 'bg-blue-600 text-white font-bold border border-blue-600' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                  >
                    {pag}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setPaginaActual(p => Math.min(Math.ceil(facturas.length / ITEMS_POR_PAGINA), p + 1))}
                disabled={paginaActual === Math.ceil(facturas.length / ITEMS_POR_PAGINA) || Math.ceil(facturas.length / ITEMS_POR_PAGINA) === 0}
                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-slate-700 transition-colors shadow-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
