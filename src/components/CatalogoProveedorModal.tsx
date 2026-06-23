"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, gql, ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/lib/apolloClient";
import AutocompleteProducto from "./AutocompleteProducto";

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
  const { data, loading, refetch } = useQuery(LISTAR_CATALOGO, {
    variables: { proveedorId },
    fetchPolicy: "network-only",
  });

  const [agregar] = useMutation(AGREGAR_CATALOGO);
  const [eliminar] = useMutation(ELIMINAR_DEL_CATALOGO);

  const [productosFull, setProductosFull] = useState<any[]>([]);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);

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

  const handleAddFromAutocomplete = async (prod: any) => {
    const precio = prompt(`¿A qué precio te vende este proveedor el producto "${prod.nombre}"?`, "0");
    if (precio === null) return; // canceló
    const numPrecio = parseFloat(precio) || 0;
    
    try {
      await agregar({
        variables: {
          proveedorId,
          productoCodigo: prod.codigo,
          precioCompra: numPrecio
        }
      });
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
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Añadir producto existente al catálogo</h4>
            <div className="w-full">
              <AutocompleteProducto 
                onSelect={handleAddFromAutocomplete} 
              />
            </div>
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
    </div>
  );
}
