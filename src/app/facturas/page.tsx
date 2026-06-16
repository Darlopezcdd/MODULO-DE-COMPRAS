'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    fetchFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-300">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">Facturas de Compra</h1>
          <Link href="/facturas/nueva" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg">
            + Nueva Factura
          </Link>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl flex gap-4 items-center border border-slate-800">
          <span className="text-sm font-semibold text-slate-400">Filtros:</span>
          <select 
            className="bg-slate-800 text-white px-3 py-2 rounded-lg outline-none border border-slate-700 focus:border-blue-500 transition-colors"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="EMITIDA">Emitida</option>
            <option value="ANULADA">Anulada</option>
          </select>
        </div>

        <div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                <th className="p-4 text-sm font-semibold text-slate-300">Número</th>
                <th className="p-4 text-sm font-semibold text-slate-300">Fecha</th>
                <th className="p-4 text-sm font-semibold text-slate-300">Tipo de Pago</th>
                <th className="p-4 text-sm font-semibold text-slate-300 text-right">Total</th>
                <th className="p-4 text-sm font-semibold text-slate-300">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {facturas.map(f => (
                <tr key={f.id} className="hover:bg-slate-800/50 transition-colors group">
                  <td className="p-4 font-mono text-sm text-blue-400">{f.numeroFactura || 'S/N'}</td>
                  <td className="p-4">{f.fecha}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${f.tipoPago === 'CREDITO' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {f.tipoPago}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-emerald-400 font-medium">
                    ${f.total?.toFixed(2)}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      f.estado === 'EMITIDA' ? 'bg-blue-500/20 text-blue-300' : 
                      f.estado === 'ANULADA' ? 'bg-red-500/20 text-red-300' : 
                      'bg-slate-500/20 text-slate-300'
                    }`}>
                      {f.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {facturas.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <div className="text-4xl mb-3 opacity-50">📄</div>
                    <p>No se encontraron facturas registradas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
