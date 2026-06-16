'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Proveedor {
  id: number;
  cedulaRuc: string;
  nombre: string;
  ciudad: string;
  tipo: string;
  estado: string;
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [aviso, setAviso] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  const fetchProveedores = async () => {
    try {
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query Listar($estado: EstadoProveedor, $tipo: TipoProveedor) {
              listarProveedores(estado: $estado, tipo: $tipo) {
                id
                cedulaRuc
                nombre
                ciudad
                tipo
                estado
              }
            }
          `,
          variables: {
            estado: filtroEstado || null,
            tipo: filtroTipo || null,
          },
        }),
      });
      const data = await res.json();
      if (data.data?.listarProveedores) {
        setProveedores(data.data.listarProveedores);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setPaginaActual(1);
    fetchProveedores();
  }, [filtroEstado, filtroTipo]);

  const desactivarProveedor = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas desactivar este proveedor?')) return;
    try {
      await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation Eliminar($id: Int!) {
              eliminarProveedor(id: $id) {
                id
                estado
              }
            }
          `,
          variables: { id },
        }),
      });
      await fetchProveedores();
      setAviso('Proveedor desactivado correctamente');
      setTimeout(() => setAviso(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Proveedores</h1>
          <Link href="/proveedores/nuevo" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            + Nuevo Proveedor
          </Link>
        </div>

        {aviso && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-sm">
            ✓ {aviso}
          </div>
        )}

        <div className="glass-panel p-4 rounded-xl flex gap-4 items-center">
          <span className="text-sm font-semibold text-slate-600">Filtros:</span>
          <select 
            className="bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>

          <select 
            className="bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos los Tipos</option>
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </select>
        </div>

        <div className="glass-panel rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">Cédula/RUC</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Nombre</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Ciudad</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Tipo</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Estado</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores
                .slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA)
                .map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-sm text-slate-500">{p.cedulaRuc}</td>
                  <td className="p-4 font-medium text-slate-900">{p.nombre}</td>
                  <td className="p-4 text-slate-500">{p.ciudad}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.tipo === 'CREDITO' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.tipo}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <Link href={`/proveedores/editar/${p.id}`} className="text-sm bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1 rounded transition-colors text-slate-700 shadow-sm">
                      Editar
                    </Link>
                    {p.estado === 'ACTIVO' && (
                      <button onClick={() => desactivarProveedor(p.id)} className="text-sm bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-3 py-1 rounded transition-colors shadow-sm">
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {proveedores.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No se encontraron proveedores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {proveedores.length > 0 && (
          <div className="flex items-center justify-between mt-4 p-4 glass-panel rounded-xl">
            <span className="text-sm text-slate-500">
              Mostrando {(paginaActual - 1) * ITEMS_POR_PAGINA + 1} a {Math.min(paginaActual * ITEMS_POR_PAGINA, proveedores.length)} de {proveedores.length} proveedores
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
                {Array.from({ length: Math.ceil(proveedores.length / ITEMS_POR_PAGINA) }, (_, i) => i + 1).map(pag => (
                  <button
                    key={pag}
                    onClick={() => setPaginaActual(pag)}
                    className={`w-8 h-8 rounded text-sm transition-colors shadow-sm ${paginaActual === pag ? 'bg-primary text-primary-foreground font-bold border border-primary' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                  >
                    {pag}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setPaginaActual(p => Math.min(Math.ceil(proveedores.length / ITEMS_POR_PAGINA), p + 1))}
                disabled={paginaActual === Math.ceil(proveedores.length / ITEMS_POR_PAGINA) || Math.ceil(proveedores.length / ITEMS_POR_PAGINA) === 0}
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
