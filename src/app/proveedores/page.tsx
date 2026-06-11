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
      fetchProveedores();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">Proveedores</h1>
          <Link href="/proveedores/nuevo" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors">
            + Nuevo Proveedor
          </Link>
        </div>

        <div className="glass-panel p-4 rounded-xl flex gap-4 items-center">
          <span className="text-sm font-semibold text-gray-300">Filtros:</span>
          <select 
            className="bg-secondary text-white px-3 py-2 rounded-lg outline-none"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>

          <select 
            className="bg-secondary text-white px-3 py-2 rounded-lg outline-none"
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
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4 text-sm font-semibold text-gray-300">Cédula/RUC</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Nombre</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Ciudad</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Tipo</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Estado</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map(p => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 font-mono text-sm">{p.cedulaRuc}</td>
                  <td className="p-4">{p.nombre}</td>
                  <td className="p-4 text-gray-400">{p.ciudad}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.tipo === 'CREDITO' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                      {p.tipo}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.estado === 'ACTIVO' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <Link href={`/proveedores/editar/${p.id}`} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition-colors">
                      Editar
                    </Link>
                    {p.estado === 'ACTIVO' && (
                      <button onClick={() => desactivarProveedor(p.id)} className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded transition-colors">
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {proveedores.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No se encontraron proveedores.
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
