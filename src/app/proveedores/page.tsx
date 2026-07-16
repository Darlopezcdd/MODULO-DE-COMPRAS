'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CatalogoProveedorModalWrapper from '@/components/CatalogoProveedorModal';
import SearchInput from '@/components/SearchInput';
import ExportButtons from '@/components/ExportButtons';
import { useDebounce } from '@/hooks/useDebounce';
import * as XLSX from 'xlsx';
import { Printer, FileSpreadsheet, Edit3, Trash2, RefreshCw } from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';

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
  const [busqueda, setBusqueda] = useState('');
  const debouncedBusqueda = useDebounce(busqueda, 400);
  const [aviso, setAviso] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [catalogoModal, setCatalogoModal] = useState<{ isOpen: boolean; id: number; nombre: string }>({ isOpen: false, id: 0, nombre: '' });
  const [user, setUser] = useState<any>(null);
  const [exportandoExcelId, setExportandoExcelId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'success' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });
  const ITEMS_POR_PAGINA = 10;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.usuario) setUser(data.usuario);
      })
      .catch(console.error);
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, filtroTipo]);

  const desactivarProveedor = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desactivar Proveedor',
      message: '¿Estás seguro de que deseas desactivar este proveedor?',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
      }
    });
  };

  const activarProveedor = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Activar Proveedor',
      message: '¿Estás seguro de que deseas activar este proveedor?',
      type: 'success',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `
                mutation Actualizar($id: Int!, $input: ProveedorUpdateInput!) {
                  actualizarProveedor(id: $id, input: $input) {
                    id
                    estado
                  }
                }
              `,
              variables: {
                id,
                input: {
                  estado: 'ACTIVO'
                }
              },
            }),
          });
          await fetchProveedores();
          setAviso('Proveedor activado correctamente');
          setTimeout(() => setAviso(''), 3000);
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  // Resetear página al buscar
  useEffect(() => {
    setPaginaActual(1);
  }, [debouncedBusqueda]);

  const exportarCatalogoExcel = async (proveedorId: number, proveedorNombre: string) => {
    if (exportandoExcelId) return;
    setExportandoExcelId(proveedorId);
    try {
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query ListarCatalogo($proveedorId: Int!) {
              listarCatalogoProveedor(proveedorId: $proveedorId) {
                id
                productoCodigo
                precioCompra
              }
            }
          `,
          variables: { proveedorId },
        }),
      });
      const resData = await res.json();
      const items = resData.data?.listarCatalogoProveedor || [];
      
      if (items.length === 0) {
        alert("Este proveedor no tiene productos en su catálogo aún.");
        return;
      }

      // Obtener detalles del inventario
      const codigos = items.map((i: any) => i.productoCodigo).join(",");
      const resDetails = await fetch(`/api/inventarios?limite=200&codigos=${codigos}`);
      const result = await resDetails.json();
      const details = result.success ? result.data : [];

      const catalogData = items.map((cat: any) => {
        const globalInfo = details.find((p: any) => p.codigo === cat.productoCodigo);
        return {
          'Código': cat.productoCodigo,
          'Producto': globalInfo?.nombre || "Producto desconocido",
          'Stock Global': globalInfo?.stockActual || 0,
          'Precio Compra': cat.precioCompra,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(catalogData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Catálogo');
      
      worksheet['!cols'] = [
        { wch: 15 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 }
      ];

      XLSX.writeFile(workbook, `Catalogo_${proveedorNombre.replace(/\s+/g, '_')}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Error al exportar catálogo.");
    } finally {
      setExportandoExcelId(null);
    }
  };

  // Filtrar proveedores por búsqueda (debounced)
  const proveedoresFiltrados = debouncedBusqueda
    ? proveedores.filter(p =>
        p.nombre?.toLowerCase().includes(debouncedBusqueda.toLowerCase()) ||
        p.cedulaRuc?.toLowerCase().includes(debouncedBusqueda.toLowerCase()) ||
        p.ciudad?.toLowerCase().includes(debouncedBusqueda.toLowerCase())
      )
    : proveedores;

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Proveedores</h1>
          <div className="flex items-center gap-3">
            <ExportButtons
              data={proveedoresFiltrados}
              fileName="Proveedores"
              columns={[
                { header: 'Nombre', key: 'nombre' },
                { header: 'Cédula/RUC', key: 'cedulaRuc' },
                { header: 'Ciudad', key: 'ciudad' },
                { header: 'Tipo', key: 'tipo' },
                { header: 'Estado', key: 'estado' },
              ]}
            />
            {user?.permisos?.crear_proveedores && (
              <Link href="/proveedores/nuevo" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                + Nuevo Proveedor
              </Link>
            )}
          </div>
        </div>

        {aviso && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-sm">
            ✓ {aviso}
          </div>
        )}

        <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center">
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

          <SearchInput
            placeholder="Buscar por nombre, cédula/RUC o ciudad..."
            onSearch={setBusqueda}
            className="flex-1 min-w-[250px]"
          />
        </div>

        <div className="glass-panel rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">Nombre</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Ciudad</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Tipo</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Estado</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedoresFiltrados
                .slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA)
                .map(p => (
                <tr 
                  key={p.id} 
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                    if (user?.permisos?.gestionar_catalogo) {
                      setCatalogoModal({ isOpen: true, id: p.id, nombre: p.nombre });
                    }
                  }}
                >
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
                  <td className="p-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Imprimir catálogo PDF */}
                    <button 
                      onClick={() => window.open(`/api/proveedores/${p.id}/catalogo/pdf`, '_blank')}
                      className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors shadow-sm animate-all duration-300"
                      title="Imprimir catálogo en PDF"
                    >
                      <Printer size={16} />
                    </button>

                    {/* Exportar catálogo Excel */}
                    <button 
                      onClick={() => exportarCatalogoExcel(p.id, p.nombre)}
                      disabled={exportandoExcelId !== null}
                      className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[28px] animate-all duration-300"
                      title="Exportar catálogo a Excel"
                    >
                      {exportandoExcelId === p.id ? (
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <FileSpreadsheet size={16} />
                      )}
                    </button>

                    {/* Editar Proveedor */}
                    {user?.permisos?.editar_proveedores && (
                      <Link 
                        href={`/proveedores/editar/${p.id}`} 
                        className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded transition-colors shadow-sm animate-all duration-300"
                        title="Editar proveedor"
                      >
                        <Edit3 size={16} />
                      </Link>
                    )}

                    {/* Desactivar Proveedor */}
                    {user?.permisos?.editar_proveedores && p.estado === 'ACTIVO' && (
                      <button 
                        onClick={() => desactivarProveedor(p.id)}
                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors shadow-sm animate-all duration-300"
                        title="Desactivar proveedor"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    {/* Activar Proveedor */}
                    {user?.permisos?.editar_proveedores && p.estado === 'INACTIVO' && (
                      <button 
                        onClick={() => activarProveedor(p.id)}
                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors shadow-sm animate-all duration-300"
                        title="Activar proveedor"
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {proveedoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No se encontraron proveedores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {proveedoresFiltrados.length > 0 && (
          <div className="flex items-center justify-between mt-4 p-4 glass-panel rounded-xl">
            <span className="text-sm text-slate-500">
              Mostrando {(paginaActual - 1) * ITEMS_POR_PAGINA + 1} a {Math.min(paginaActual * ITEMS_POR_PAGINA, proveedoresFiltrados.length)} de {proveedoresFiltrados.length} proveedores
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
                {Array.from({ length: Math.ceil(proveedoresFiltrados.length / ITEMS_POR_PAGINA) }, (_, i) => i + 1).map(pag => (
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
                onClick={() => setPaginaActual(p => Math.min(Math.ceil(proveedoresFiltrados.length / ITEMS_POR_PAGINA), p + 1))}
                disabled={paginaActual === Math.ceil(proveedoresFiltrados.length / ITEMS_POR_PAGINA) || Math.ceil(proveedoresFiltrados.length / ITEMS_POR_PAGINA) === 0}
                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-slate-700 transition-colors shadow-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {catalogoModal.isOpen && (
        <CatalogoProveedorModalWrapper
          proveedorId={catalogoModal.id}
          proveedorNombre={catalogoModal.nombre}
          onClose={() => setCatalogoModal({ isOpen: false, id: 0, nombre: '' })}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
