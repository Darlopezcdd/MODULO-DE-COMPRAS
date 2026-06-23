"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, ApolloProvider } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apolloClient";
import AutocompleteProducto from "./AutocompleteProducto";
import NuevoProductoModal from "./NuevoProductoModal";

const LISTAR_CATALOGO = gql`
  query ListarCatalogo($proveedorId: Int!) {
    listarCatalogoProveedor(proveedorId: $proveedorId) {
      id
      productoCodigo
      precioCompra
    }
  }
`;

const AGREGAR_CATALOGO = gql`
  mutation AgregarAlCatalogo($proveedorId: Int!, $productoCodigo: String!, $precioCompra: Float!) {
    agregarAlCatalogo(proveedorId: $proveedorId, productoCodigo: $productoCodigo, precioCompra: $precioCompra) {
      id
      productoCodigo
      precioCompra
    }
  }
`;

const ELIMINAR_DEL_CATALOGO = gql`
  mutation EliminarDelCatalogo($id: Int!) {
    eliminarDelCatalogo(id: $id)
  }
`;

interface CatalogoModalProps {
  proveedorId: number;
  proveedorNombre: string;
  onClose: () => void;
}

export default function CatalogoProveedorModalWrapper(props: CatalogoModalProps) {
  return (
    <ApolloProvider client={apolloClient}>
      <CatalogoProveedorModal {...props} />
    </ApolloProvider>
  );
}

function CatalogoProveedorModal({ proveedorId, proveedorNombre, onClose }: CatalogoModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading, refetch } = useQuery<any>(LISTAR_CATALOGO, {
    variables: { proveedorId },
    fetchPolicy: "network-only",
  });

  const [agregar] = useMutation(AGREGAR_CATALOGO);
  const [eliminar] = useMutation(ELIMINAR_DEL_CATALOGO);

  const [productosFull, setProductosFull] = useState<any[]>([]);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);
  
  // Estado para la seleccion inline
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [precioInput, setPrecioInput] = useState<string>("");

  // Cargar detalles de los productos usando sus códigos
  useEffect(() => {
    const fetchDetalles = async () => {
      const items = data?.listarCatalogoProveedor || [];
      if (items.length === 0) {
        setProductosFull([]);
        return;
      }
      setCargandoDetalles(true);
      const codigos = items.map((i: any) => i.productoCodigo).join(",");
      try {
        const res = await fetch(`/api/inventarios?limite=200&codigos=${codigos}`);
        const result = await res.json();
        if (result.success) {
          // Unir datos del catálogo local con la información del inventario global
          const combinados = items.map((cat: any) => {
            const globalInfo = result.data.find((p: any) => p.codigo === cat.productoCodigo);
            return {
              ...cat,
              nombre: globalInfo?.nombre || "Producto desconocido",
              stockActual: globalInfo?.stockActual || 0,
            };
          });
          setProductosFull(combinados);
        }
      } catch (e) {
        console.error("Error al obtener detalles", e);
      } finally {
        setCargandoDetalles(false);
      }
    };

    if (data && !loading) {
      fetchDetalles();
    }
  }, [data, loading]);

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Quitar producto de este catálogo?")) return;
    try {
      await eliminar({ variables: { id } });
      refetch();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleAddFromAutocomplete = (prod: any) => {
    setProductoSeleccionado(prod);
    setPrecioInput("");
  };

  const confirmarAgregar = async () => {
    if (!productoSeleccionado) return;
    const numPrecio = parseFloat(precioInput) || 0;
    if (numPrecio <= 0) {
      alert("Ingrese un precio válido mayor a 0");
      return;
    }
    
    try {
      await agregar({
        variables: {
          proveedorId,
          productoCodigo: productoSeleccionado.codigo,
          precioCompra: numPrecio
        }
      });
      setProductoSeleccionado(null);
      setPrecioInput("");
      refetch();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Catálogo de Proveedor</h3>
            <p className="text-sm text-slate-500">{proveedorNombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">✕</button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50">
          
          <div className="mb-6 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-slate-700">Añadir producto existente al catálogo</h4>
              <button 
                onClick={() => setShowNuevoProducto(true)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition"
              >
                + Crear Producto Nuevo
              </button>
            </div>
            
            {!productoSeleccionado ? (
              <div className="w-full">
                <AutocompleteProducto 
                  onSelect={handleAddFromAutocomplete} 
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{productoSeleccionado.nombre}</p>
                  <p className="text-xs text-slate-500">Código: {productoSeleccionado.codigo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Precio de compra:</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-28 pl-7 pr-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
                      value={precioInput}
                      onChange={(e) => setPrecioInput(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                  <button 
                    onClick={confirmarAgregar}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md font-medium text-sm shadow-sm transition"
                  >
                    Guardar
                  </button>
                  <button 
                    onClick={() => setProductoSeleccionado(null)}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md font-medium text-sm transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <tr>
                  <th className="p-3 font-semibold">Código</th>
                  <th className="p-3 font-semibold">Producto</th>
                  <th className="p-3 font-semibold">Stock Global</th>
                  <th className="p-3 font-semibold text-right">Precio Compra</th>
                  <th className="p-3 font-semibold text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading || cargandoDetalles ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">Cargando catálogo...</td></tr>
                ) : productosFull.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">Este proveedor no tiene productos en su catálogo aún.</td></tr>
                ) : (
                  productosFull.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 text-sm">
                      <td className="p-3 font-mono text-slate-500">{item.productoCodigo}</td>
                      <td className="p-3 font-medium text-slate-900">{item.nombre}</td>
                      <td className="p-3 text-slate-600">{item.stockActual}</td>
                      <td className="p-3 text-right font-bold text-blue-600">${item.precioCompra.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleEliminar(item.id)}
                          className="text-red-500 hover:text-red-700 font-bold px-2 py-1 bg-red-50 hover:bg-red-100 rounded transition"
                          title="Quitar del catálogo"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
      
      {showNuevoProducto && (
        <NuevoProductoModal
          proveedorId={proveedorId}
          onClose={() => setShowNuevoProducto(false)}
          onSuccess={() => {
            setShowNuevoProducto(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
