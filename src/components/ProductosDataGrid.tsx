'use client';
// src/components/ProductosDataGrid.tsx
// HU3 — DataGrid de Detalle de Factura (Diseño — Aldahir Requene)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { calculateFacturaTotals } from '@/lib/facturaMath';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ProductoInventario {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  pvp: number;
  grabaIva: boolean;
  porcentajeIva: number;
  stock: number;
  unidad: string;
}

interface LineaDetalle {
  _key: string;
  productoId: number | null;
  codigo: string;
  descripcion: string;
  unidad: string;
  stockDisponible: number;
  cantidad: number;
  pvp: number;
  grabaIva: boolean;
  porcentajeIva: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeKey = () => Math.random().toString(36).slice(2);
const fmt = (n: number) => `$${n.toFixed(2)}`;
const roundTo2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function lineaSubtotal(l: LineaDetalle) {
  return roundTo2(l.cantidad * l.pvp);
}
function lineaIva(l: LineaDetalle) {
  const sub = lineaSubtotal(l);
  return l.grabaIva ? roundTo2(sub * (l.porcentajeIva / 100)) : 0;
}
function lineaTotal(l: LineaDetalle) {
  return roundTo2(lineaSubtotal(l) + lineaIva(l));
}

// ── Sub-componente: Buscador de Productos ─────────────────────────────────────
function BuscadorProducto({ onSelect }: { onSelect: (p: ProductoInventario) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductoInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buscar = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    fetch(`/api/inventario/productos?buscar=${encodeURIComponent(q)}&limite=8`)
      .then(r => r.json())
      .then(json => {
        setResults(json.data ?? []);
        setOpen(true);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(val), 300);
  };

  const handleSelect = (p: ProductoInventario) => {
    onSelect(p);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            id="buscar-producto"
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Buscar por código, nombre o categoría..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs animate-pulse">
              buscando...
            </span>
          )}
        </div>
      </div>

      {/* Dropdown de resultados */}
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700">
            <span className="text-xs text-slate-400">{results.length} resultado(s) encontrado(s)</span>
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {results.map(p => (
              <li
                key={p.id}
                onClick={() => handleSelect(p)}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-800 last:border-0 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-blue-400">{p.codigo}</span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs text-slate-400">{p.categoria}</span>
                  </div>
                  <div className="text-sm text-white font-medium truncate">{p.nombre}</div>
                </div>
                <div className="ml-4 text-right flex-shrink-0">
                  <div className="text-sm font-bold text-emerald-400">{fmt(p.pvp)}</div>
                  <div className={`text-xs font-medium ${p.stock > 20 ? 'text-emerald-500' : p.stock > 5 ? 'text-amber-400' : 'text-red-400'}`}>
                    Stock: {p.stock} {p.unidad}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-600 rounded-xl p-4 text-center text-slate-400 text-sm shadow-2xl">
          No se encontraron productos para &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}

// ── Componente principal: ProductosDataGrid ───────────────────────────────────
export default function ProductosDataGrid() {
  const [lineas, setLineas] = useState<LineaDetalle[]>([]);

  const agregarProducto = (p: ProductoInventario) => {
    // Si ya existe el producto, incrementar cantidad
    const existIdx = lineas.findIndex(l => l.productoId === p.id);
    if (existIdx >= 0) {
      const updated = [...lineas];
      updated[existIdx].cantidad = roundTo2(updated[existIdx].cantidad + 1);
      setLineas(updated);
      return;
    }
    setLineas(prev => [
      ...prev,
      {
        _key: makeKey(),
        productoId:       p.id,
        codigo:           p.codigo,
        descripcion:      p.nombre,
        unidad:           p.unidad,
        stockDisponible:  p.stock,
        cantidad:         1,
        pvp:              p.pvp,
        grabaIva:         p.grabaIva,
        porcentajeIva:    p.porcentajeIva,
      },
    ]);
  };

  const actualizarLinea = (key: string, field: keyof LineaDetalle, value: any) => {
    setLineas(prev => prev.map(l => l._key === key ? { ...l, [field]: value } : l));
  };

  const eliminarLinea = (key: string) => {
    setLineas(prev => prev.filter(l => l._key !== key));
  };

  // Calcular totales usando facturaMath.ts (Dario López)
  const totales = calculateFacturaTotals(
    lineas.map(l => ({
      cantidad:      l.cantidad,
      pvp:           l.pvp,
      grabaIva:      l.grabaIva,
      porcentajeIva: l.porcentajeIva,
    }))
  );

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-blue-400">📦</span> Detalle de Productos
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {lineas.length === 0 ? 'Sin líneas agregadas' : `${lineas.length} línea(s) · ${lineas.reduce((a, l) => a + l.cantidad, 0)} unidades`}
          </p>
        </div>
        {lineas.length > 0 && (
          <button
            type="button"
            onClick={() => setLineas([])}
            className="text-xs text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 px-3 py-1.5 rounded-lg transition-all"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* ── Buscador ────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Agregar Producto desde Inventario
        </label>
        <BuscadorProducto onSelect={agregarProducto} />
      </div>

      {/* ── DataGrid ────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        {lineas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-base font-medium">Sin productos agregados</p>
            <p className="text-sm mt-1">Usa el buscador para agregar productos al detalle.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-slate-300 text-xs uppercase tracking-wider">
                <th className="px-3 py-3 text-center w-8">#</th>
                <th className="px-3 py-3 text-left w-24">Código</th>
                <th className="px-3 py-3 text-left">Descripción</th>
                <th className="px-3 py-3 text-center w-20">Stock</th>
                <th className="px-3 py-3 text-center w-24">Cantidad</th>
                <th className="px-3 py-3 text-right w-28">PVP</th>
                <th className="px-3 py-3 text-center w-20">IVA</th>
                <th className="px-3 py-3 text-right w-28">Subtotal</th>
                <th className="px-3 py-3 text-right w-24">IVA $</th>
                <th className="px-3 py-3 text-right w-28">Total</th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lineas.map((linea, idx) => {
                const sub   = lineaSubtotal(linea);
                const iva   = lineaIva(linea);
                const total = lineaTotal(linea);
                const stockBajo = linea.cantidad > linea.stockDisponible;

                return (
                  <tr
                    key={linea._key}
                    data-testid={`detalle-row-${idx}`}
                    className={`transition-colors ${idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/40'} hover:bg-slate-800`}
                  >
                    {/* # */}
                    <td className="px-3 py-2.5 text-center text-slate-500 font-mono text-xs">{idx + 1}</td>

                    {/* Código */}
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded">
                        {linea.codigo}
                      </span>
                    </td>

                    {/* Descripción */}
                    <td className="px-3 py-2.5">
                      <input
                        data-testid={`desc-detalle-${idx}`}
                        type="text"
                        value={linea.descripcion}
                        onChange={e => actualizarLinea(linea._key, 'descripcion', e.target.value)}
                        className="w-full bg-transparent text-white text-sm border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-none transition-colors py-0.5"
                      />
                    </td>

                    {/* Stock disponible */}
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        stockBajo
                          ? 'bg-red-900/50 text-red-400 border border-red-700'
                          : linea.stockDisponible <= 20
                          ? 'bg-amber-900/50 text-amber-400 border border-amber-700'
                          : 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
                      }`}>
                        {linea.stockDisponible}
                      </span>
                      {stockBajo && <div className="text-red-400 text-xs mt-0.5">⚠ Stock insuf.</div>}
                    </td>

                    {/* Cantidad */}
                    <td className="px-3 py-2.5">
                      <input
                        data-testid={`qty-detalle-${idx}`}
                        type="number"
                        min="0.0001"
                        step="1"
                        value={linea.cantidad}
                        onChange={e => actualizarLinea(linea._key, 'cantidad', parseFloat(e.target.value) || 0)}
                        className={`w-full text-center bg-slate-800 border rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 transition-all ${
                          stockBajo ? 'border-red-600 focus:ring-red-500' : 'border-slate-600 focus:ring-blue-500'
                        }`}
                      />
                    </td>

                    {/* PVP */}
                    <td className="px-3 py-2.5">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <input
                          data-testid={`pvp-detalle-${idx}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={linea.pvp}
                          onChange={e => actualizarLinea(linea._key, 'pvp', parseFloat(e.target.value) || 0)}
                          className="w-full text-right bg-slate-800 border border-slate-600 rounded-lg pl-5 pr-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </td>

                    {/* Toggle IVA */}
                    <td className="px-3 py-2.5 text-center">
                      <button
                        data-testid={`iva-detalle-${idx}`}
                        type="button"
                        onClick={() => actualizarLinea(linea._key, 'grabaIva', !linea.grabaIva)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all ${
                          linea.grabaIva
                            ? 'bg-blue-900/60 text-blue-300 border-blue-600 hover:bg-blue-800'
                            : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                        }`}
                      >
                        {linea.grabaIva ? `${linea.porcentajeIva}%` : '0%'}
                      </button>
                    </td>

                    {/* Subtotal */}
                    <td className="px-3 py-2.5 text-right text-slate-300 font-mono text-sm">{fmt(sub)}</td>

                    {/* IVA $ */}
                    <td className="px-3 py-2.5 text-right text-blue-400 font-mono text-sm">{fmt(iva)}</td>

                    {/* Total línea */}
                    <td className="px-3 py-2.5 text-right text-white font-bold font-mono">{fmt(total)}</td>

                    {/* Eliminar */}
                    <td className="px-3 py-2.5 text-center">
                      <button
                        data-testid={`remove-detalle-${idx}`}
                        type="button"
                        onClick={() => eliminarLinea(linea._key)}
                        className="text-slate-500 hover:text-red-400 transition-colors text-lg leading-none"
                        title="Eliminar línea"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Panel de Totales ─────────────────────────────────────────────────── */}
      {lineas.length > 0 && (
        <div className="px-6 py-5 bg-slate-800 border-t border-slate-700 flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm text-slate-300">
              <span>Subtotal sin IVA:</span>
              <span data-testid="subtotal-sin-iva" className="font-mono">{fmt(totales.subtotalSinIva)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-300">
              <span>Subtotal con IVA:</span>
              <span data-testid="subtotal-con-iva" className="font-mono">{fmt(totales.subtotalConIva)}</span>
            </div>
            <div className="flex justify-between text-sm text-blue-400">
              <span>IVA (15%):</span>
              <span data-testid="total-iva" className="font-mono">{fmt(totales.totalIva)}</span>
            </div>
            <div className="border-t border-slate-600 pt-3 flex justify-between items-center">
              <span className="text-base font-bold text-white">TOTAL:</span>
              <span data-testid="total-general" className="text-xl font-bold text-emerald-400 font-mono">
                {fmt(totales.total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
