<<<<<<< HEAD
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
=======
import React from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function FacturasPage() {
  const facturasDb = await prisma.facturas_compra.findMany({
    orderBy: { fecha: 'desc' }
  });

  const proveedoresIds = [...new Set(facturasDb.map(f => f.proveedor_id))];
  const proveedores = await prisma.proveedor.findMany({
    where: { id: { in: proveedoresIds } }
  });

  const proveedorMap = Object.fromEntries(proveedores.map(p => [p.id, p.nombre]));

  const facturasList = facturasDb.map(f => ({
    id: f.id.toString(),
    proveedor: proveedorMap[f.proveedor_id] || 'Desconocido',
    fecha: f.fecha.toISOString().split('T')[0],
    total: `$${Number(f.total).toFixed(2)}`,
    estado: f.estado || 'PENDIENTE'
  }));

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Facturas</h1>
          <Link href="/facturas/nueva" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
            <Plus className="w-5 h-5" /> Nueva Factura
          </Link>
        </div>

        <div className="bg-white p-4 rounded-xl flex gap-4 items-center border border-slate-200 shadow-sm">
          <span className="text-sm font-semibold text-slate-600">Buscar:</span>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por proveedor o código..." 
              className="bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2 rounded-lg outline-none w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">ID</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Proveedor</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Fecha</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Total</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Estado</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturasList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No hay facturas registradas.
                  </td>
                </tr>
              ) : facturasList.map(f => (
                <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-sm text-slate-500">{f.id}</td>
                  <td className="p-4 text-slate-900 font-medium">{f.proveedor}</td>
                  <td className="p-4 text-slate-500">{f.fecha}</td>
                  <td className="p-4 font-medium text-slate-900">{f.total}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      f.estado === 'EMITIDA' ? 'bg-blue-100 text-blue-700' : 
                      f.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700' : 
                      f.estado === 'ANULADA' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
>>>>>>> origin
                    }`}>
                      {f.estado}
                    </span>
                  </td>
<<<<<<< HEAD
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
=======
                  <td className="p-4 flex gap-2">
                    <button className="text-sm bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1 rounded transition-colors shadow-sm">
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
>>>>>>> origin
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
