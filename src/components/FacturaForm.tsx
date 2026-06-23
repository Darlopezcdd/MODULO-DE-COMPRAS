"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, ApolloProvider } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apolloClient";
import AutocompleteProveedor from "./AutocompleteProveedor";
import { FacturaPdfPreview } from './FacturaPdfPreview';
import AutocompleteProducto from "./AutocompleteProducto";
import NuevoProductoModal from "./NuevoProductoModal";

const LISTAR_CATALOGO = gql`
  query ListarCatalogo($proveedorId: Int!) {
    listarCatalogoProveedor(proveedorId: $proveedorId) {
      productoCodigo
      precioCompra
    }
  }
`;

const AGREGAR_CATALOGO = gql`
  mutation AgregarAlCatalogo($proveedorId: Int!, $productoCodigo: String!, $precioCompra: Float!) {
    agregarAlCatalogo(proveedorId: $proveedorId, productoCodigo: $productoCodigo, precioCompra: $precioCompra) {
      id
      precioCompra
      productoCodigo
    }
  }
`;
export default function FacturaForm() {
  return (
    <ApolloProvider client={apolloClient}>
      <FacturaFormContent />
    </ApolloProvider>
  );
}

interface ProveedorSeleccionado {
  id?: number;
  cedulaRuc?: string;
  nombre?: string;
  direccion?: string;
  telefono?: string;
}

function FacturaFormContent() {
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorSeleccionado | null>(null);
  const [showNewProductModal, setShowNewProductModal] = useState(false);

  const { data: catalogData, refetch: refetchCatalog } = useQuery(LISTAR_CATALOGO, {
    variables: { proveedorId: selectedProveedor?.id },
    skip: !selectedProveedor?.id,
  });

  const [agregarAlCatalogo] = useMutation(AGREGAR_CATALOGO);

  const catalogoMap = new Map(
    catalogData?.listarCatalogoProveedor?.map((c: any) => [c.productoCodigo, c.precioCompra]) || []
  );

  const [productos, setProductos] = useState([
    { codigo: "", descripcion: "", cantidad: 1, pvp: 0, grabaIva: true, porcentajeIva: 15 }
  ]);

  const handleAddProduct = () => {
    setProductos([...productos, { codigo: "", descripcion: "", cantidad: 1, pvp: 0, grabaIva: true, porcentajeIva: 15 }]);
  };

  const handleRemoveProduct = (index: number) => {
    setProductos(productos.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: string, value: string | number | boolean) => {
    const newProductos = [...productos];
    newProductos[index] = { ...newProductos[index], [field]: value };
    setProductos(newProductos);
  };

  const roundToTwo = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;


  const totales = {
    subtotalSinIva: 0,
    subtotalConIva: 0,
    totalIva: 0,
    total: 0,
  };

  productos.forEach((prod) => {
    const sub = roundToTwo(prod.cantidad * prod.pvp);
    if (prod.grabaIva) {
      totales.subtotalConIva += sub;
      totales.totalIva += roundToTwo(sub * (prod.porcentajeIva / 100));
    } else {
      totales.subtotalSinIva += sub;
    }
  });
  
  totales.total = totales.subtotalSinIva + totales.subtotalConIva + totales.totalIva;


  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 mb-8 mt-6">
      <h2 className="text-2xl font-semibold mb-6 text-slate-900 border-b border-slate-200 pb-4">
        Cabecera de Factura
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AutocompleteProveedor
          onSelect={(prov) => setSelectedProveedor(prov)}
          value={selectedProveedor?.nombre || ''}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cédula / RUC</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 outline-none"
            readOnly
            value={selectedProveedor?.cedulaRuc || ""}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 outline-none"
            readOnly
            value={selectedProveedor?.direccion || ""}
          />
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-slate-900">Detalle de Productos</h3>
          <div className="flex gap-2">
            {selectedProveedor?.id && (
              <button
                type="button"
                onClick={() => setShowNewProductModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium shadow-sm"
              >
                ✨ Crear Producto Nuevo
              </button>
            )}
            <button
              type="button"
              data-testid="add-product-btn"
              onClick={handleAddProduct}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium shadow-sm"
            >
              + Agregar Fila
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm">
                <th className="p-3 border-b border-slate-200">Descripción</th>
                <th className="p-3 border-b border-slate-200 w-24">Cantidad</th>
                <th className="p-3 border-b border-slate-200 w-32">PVP</th>
                <th className="p-3 border-b border-slate-200 w-24 text-center">Graba IVA</th>
                <th className="p-3 border-b border-slate-200 w-32 text-right">Total</th>
                <th className="p-3 border-b border-slate-200 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {productos.map((prod, index) => {
                const subtotal = roundToTwo(prod.cantidad * prod.pvp);
                const isNew = prod.codigo && !catalogoMap.has(prod.codigo) && selectedProveedor?.id;
                
                return (
                  <tr key={index} data-testid={`product-row-${index}`} className={`border-b text-sm transition-colors ${isNew ? 'bg-amber-50 border-amber-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <td className="p-3">
                      <AutocompleteProducto
                        onSelect={(p) => {
                          updateProduct(index, "codigo", p.codigo);
                          updateProduct(index, "descripcion", p.nombre);
                          updateProduct(index, "grabaIva", p.grabaIva);
                          updateProduct(index, "porcentajeIva", p.porcentajeIva);
                          
                          // Autocompletar precio si está en catálogo
                          if (catalogoMap.has(p.codigo)) {
                            updateProduct(index, "pvp", catalogoMap.get(p.codigo));
                          } else {
                            updateProduct(index, "pvp", p.precioUnitario || 0);
                          }
                        }}
                      />
                      {prod.codigo && !catalogoMap.has(prod.codigo) && selectedProveedor?.id && (
                        <div className="mt-1 text-xs text-amber-600 flex items-center gap-2">
                          <span>⚠️ Nuevo para proveedor</span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await agregarAlCatalogo({
                                  variables: {
                                    proveedorId: selectedProveedor.id,
                                    productoCodigo: prod.codigo,
                                    precioCompra: prod.pvp
                                  }
                                });
                                await refetchCatalog();
                                alert("Agregado al catálogo del proveedor con éxito");
                              } catch (e: any) {
                                alert("Error al agregar: " + e.message);
                              }
                            }}
                            className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded hover:bg-amber-200 transition"
                          >
                            Añadir al catálogo (con precio actual)
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        data-testid={`qty-${index}`}
                        className="w-full px-2 py-1 bg-white border border-slate-300 text-slate-900 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        min="1"
                        value={prod.cantidad}
                        onChange={(e) => updateProduct(index, "cantidad", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        data-testid={`pvp-${index}`}
                        className="w-full px-2 py-1 bg-white border border-slate-300 text-slate-900 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        min="0"
                        step="0.01"
                        value={prod.pvp}
                        onChange={(e) => updateProduct(index, "pvp", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        data-testid={`iva-${index}`}
                        checked={prod.grabaIva}
                        onChange={(e) => updateProduct(index, "grabaIva", e.target.checked)}
                        className="accent-blue-600"
                      />
                    </td>
                    <td className="p-3 text-right font-medium text-slate-700">
                      ${subtotal.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        data-testid={`remove-${index}`}
                        onClick={() => handleRemoveProduct(index)}
                        className="text-red-500 hover:text-red-600 font-bold"
                      >
                        X
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-64 bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-slate-500">Subtotal (Sin IVA):</span>
              <span data-testid="subtotal-sin-iva" className="font-medium text-slate-900">${totales.subtotalSinIva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-slate-500">Subtotal (Con IVA):</span>
              <span data-testid="subtotal-con-iva" className="font-medium text-slate-900">${totales.subtotalConIva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-slate-500">IVA (15%):</span>
              <span data-testid="total-iva" className="font-medium text-slate-900">${totales.totalIva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-slate-300 text-lg font-bold text-slate-900">
              <span>Total:</span>
              <span data-testid="total-general" className="text-blue-600">${totales.total.toFixed(2)}</span>
            </div>
            
            {/* Componente de Previsualización de PDF */}
            <div className="mt-5">
              <FacturaPdfPreview data={{ proveedor: selectedProveedor, productos, totales }} />
            </div>
          </div>
        </div>
      </div>
      
      {showNewProductModal && selectedProveedor?.id && (
        <NuevoProductoModal
          proveedorId={selectedProveedor.id}
          onClose={() => setShowNewProductModal(false)}
          onSuccess={async (codigo, nombre, precioCompra) => {
            setShowNewProductModal(false);
            await refetchCatalog();
            
            // Auto agregar el producto a una nueva fila o a la última vacía
            const lastRowIndex = productos.length - 1;
            const lastRow = productos[lastRowIndex];
            
            if (lastRow && !lastRow.codigo) {
              updateProduct(lastRowIndex, "codigo", codigo);
              updateProduct(lastRowIndex, "descripcion", nombre);
              updateProduct(lastRowIndex, "pvp", precioCompra);
            } else {
              setProductos([...productos, { 
                codigo, 
                descripcion: nombre, 
                cantidad: 1, 
                pvp: precioCompra, 
                grabaIva: true, 
                porcentajeIva: 15 
              }]);
            }
          }}
        />
      )}
    </div>
  );
}
