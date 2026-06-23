"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, ApolloProvider, useApolloClient } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apolloClient";
import { useRouter } from "next/navigation";
import AutocompleteProveedor from "./AutocompleteProveedor";
import { FacturaPdfPreview } from './FacturaPdfPreview';
import AutocompleteProducto from "./AutocompleteProducto";
import NuevoProductoModal from "./NuevoProductoModal";
import { useSearchParams } from "next/navigation";

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

const MEJOR_PROVEEDOR = gql`
  query MejorProveedor($productoCodigo: String!) {
    mejorProveedor(productoCodigo: $productoCodigo) {
      proveedor {
        id
        cedulaRuc
        nombre
        direccion
        telefono
      }
      precioCompra
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
  const searchParams = useSearchParams();
  const productoQuery = searchParams.get("producto");
  const apollo = useApolloClient();

  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorSeleccionado | null>(null);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [facturaGenerada, setFacturaGenerada] = useState<any>(null);
  const [tipoPago, setTipoPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  
  const router = useRouter();

  const { data: catalogData, refetch: refetchCatalog } = useQuery(LISTAR_CATALOGO, {
    variables: { proveedorId: selectedProveedor?.id },
    skip: !selectedProveedor?.id,
  });

  const [agregarAlCatalogo] = useMutation(AGREGAR_CATALOGO);

  const catalogoMap = new Map(
    catalogData?.listarCatalogoProveedor?.map((c: any) => [c.productoCodigo, c.precioCompra]) || []
  );

  const [catalogoRapido, setCatalogoRapido] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetalles = async () => {
      const items = catalogData?.listarCatalogoProveedor || [];
      if (items.length === 0) {
        setCatalogoRapido([]);
        return;
      }
      const codigos = items.map((i: any) => i.productoCodigo).join(",");
      try {
        const res = await fetch(`/api/inventarios?limite=200&codigos=${codigos}`);
        const result = await res.json();
        if (result.success) {
          const combinados = items.map((cat: any) => {
            const globalInfo = result.data.find((p: any) => p.codigo === cat.productoCodigo);
            return {
              ...cat,
              nombre: globalInfo?.nombre || "Producto desconocido",
              grabaIva: globalInfo?.grabaIva || true,
              porcentajeIva: globalInfo?.porcentajeIva || 15,
            };
          });
          setCatalogoRapido(combinados);
        }
      } catch (e) {
        console.error("Error al obtener catálogo rápido", e);
      }
    };
    if (catalogData) {
      fetchDetalles();
    }
  }, [catalogData]);

  const [productos, setProductos] = useState([
    { codigo: "", descripcion: "", cantidad: 1, pvp: 0, grabaIva: true, porcentajeIva: 15 }
  ]);

  // Auto-selección desde el dashboard
  useEffect(() => {
    if (productoQuery && !selectedProveedor) {
      const autoSelect = async () => {
        try {
          // 1. Obtener detalles del producto de la API de inventarios
          const res = await fetch(`/api/inventarios?limite=1&termino=${productoQuery}`);
          const result = await res.json();
          const productoGlobal = result.data?.find((p: any) => p.codigo === productoQuery);
          
          if (!productoGlobal) return;

          // 2. Buscar el mejor proveedor en GraphQL
          const { data } = await apollo.query({
            query: MEJOR_PROVEEDOR,
            variables: { productoCodigo: productoQuery },
          });

          if (data?.mejorProveedor) {
            setSelectedProveedor(data.mejorProveedor.proveedor);
            setProductos([{
              codigo: productoGlobal.codigo,
              descripcion: productoGlobal.nombre,
              cantidad: 1,
              pvp: data.mejorProveedor.precioCompra,
              grabaIva: productoGlobal.grabaIva,
              porcentajeIva: productoGlobal.porcentajeIva,
            }]);
          } else {
            // Si no hay proveedor en catálogo, solo pre-llenar el producto
            setProductos([{
              codigo: productoGlobal.codigo,
              descripcion: productoGlobal.nombre,
              cantidad: 1,
              pvp: productoGlobal.precioUnitario,
              grabaIva: productoGlobal.grabaIva,
              porcentajeIva: productoGlobal.porcentajeIva,
            }]);
          }
        } catch (e) {
          console.error("Error auto-seleccionando", e);
        }
      };
      autoSelect();
    }
  }, [productoQuery, apollo]);

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

  const handleSaveFactura = async () => {
    if (!selectedProveedor?.id) {
      alert("Por favor seleccione un proveedor primero.");
      return;
    }
    
    const validProductos = productos.filter(p => p.codigo && p.cantidad > 0 && p.pvp >= 0);
    if (validProductos.length === 0) {
      alert("Agregue al menos un producto válido a la factura.");
      return;
    }

    if (tipoPago === 'CREDITO' && !fechaVencimiento) {
      alert("La fecha de vencimiento es obligatoria para compras a crédito.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedorId: selectedProveedor.id,
          tipoPago,
          fechaVencimiento,
          productos: validProductos
        })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error al guardar factura');

      setFacturaGenerada(body.factura);
      setSaveSuccess(true);
      
      // Redirigir a la lista de facturas después de 3 segundos
      setTimeout(() => {
        router.push('/facturas');
      }, 3000);
      
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (saveSuccess) {
    return (
      <div className="p-12 bg-white rounded-xl shadow-lg border border-emerald-200 mt-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Factura Generada Exitosamente!</h2>
        <p className="text-slate-500 mb-8 max-w-md">
          La factura <strong className="text-emerald-600">FC-{facturaGenerada?.id?.toString().padStart(8, '0')}</strong> ha sido guardada y procesada correctamente en el sistema.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/facturas')}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
          >
            Ver lista de facturas
          </button>
          <button
            onClick={() => {
              setSaveSuccess(false);
              setFacturaGenerada(null);
              setSelectedProveedor(null);
              setProductos([{ codigo: "", descripcion: "", cantidad: 1, pvp: 0, grabaIva: true, porcentajeIva: 15 }]);
              setTipoPago('CONTADO');
              setFechaVencimiento('');
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            Crear otra factura
          </button>
        </div>
        <p className="text-sm text-slate-400 mt-8 animate-pulse">Redirigiendo automáticamente en 3 segundos...</p>
      </div>
    );
  }

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

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 outline-none"
              readOnly
              value={selectedProveedor?.direccion || ""}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Pago</label>
            <select
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              value={tipoPago}
              onChange={(e) => setTipoPago(e.target.value as 'CONTADO' | 'CREDITO')}
            >
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Crédito</option>
            </select>
          </div>
        </div>
        
        {tipoPago === 'CREDITO' && (
          <div className="md:col-span-2 mt-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Vencimiento <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="w-1/2 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              required
            />
          </div>
        )}
      </div>

      {catalogoRapido.length > 0 && (
        <div className="mt-6 border border-blue-100 bg-blue-50/30 p-4 rounded-xl">
          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <span className="text-lg">⚡</span> Acceso Rápido: Catálogo del Proveedor
          </h4>
          <div className="flex flex-wrap gap-2">
            {catalogoRapido.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  const existingIndex = productos.findIndex(p => p.codigo === item.productoCodigo);
                  
                  if (existingIndex >= 0) {
                    // Si ya existe, incrementar cantidad
                    updateProduct(existingIndex, "cantidad", productos[existingIndex].cantidad + 1);
                  } else {
                    const lastRowIndex = productos.length - 1;
                    const lastRow = productos[lastRowIndex];
                    
                    if (lastRow && !lastRow.codigo) {
                      updateProduct(lastRowIndex, "codigo", item.productoCodigo);
                      updateProduct(lastRowIndex, "descripcion", item.nombre);
                      updateProduct(lastRowIndex, "pvp", item.precioCompra);
                      updateProduct(lastRowIndex, "grabaIva", item.grabaIva);
                      updateProduct(lastRowIndex, "porcentajeIva", item.porcentajeIva);
                    } else {
                      setProductos([...productos, { 
                        codigo: item.productoCodigo, 
                        descripcion: item.nombre, 
                        cantidad: 1, 
                        pvp: item.precioCompra, 
                        grabaIva: item.grabaIva, 
                        porcentajeIva: item.porcentajeIva 
                      }]);
                    }
                  }
                }}
                className="flex flex-col items-start bg-white border border-blue-200 hover:border-blue-400 hover:shadow-md px-3 py-2 rounded-lg transition-all text-left min-w-[140px] max-w-[200px]"
              >
                <span className="text-xs font-mono text-slate-500 mb-0.5">{item.productoCodigo}</span>
                <span className="text-sm font-medium text-slate-900 truncate w-full">{item.nombre}</span>
                <span className="text-sm font-bold text-blue-600 mt-1">${Number(item.precioCompra).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
                        value={prod.codigo ? `${prod.codigo} - ${prod.descripcion}` : ""}
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
            
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSaveFactura}
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-300 shadow-sm flex items-center justify-center gap-2"
              >
                {isSaving ? "Guardando..." : "✅ Guardar Factura"}
              </button>
              
              <FacturaPdfPreview 
                data={{ 
                  numeroFactura: "Borrador",
                  proveedorNombre: selectedProveedor?.nombre || "Desconocido",
                  proveedorRuc: selectedProveedor?.cedulaRuc || "N/A",
                  tipoPago: tipoPago,
                  fechaVencimiento: fechaVencimiento || "N/A",
                  items: productos.filter(p => p.codigo).map(p => ({
                    descripcion: p.descripcion,
                    aplicaIva: p.grabaIva,
                    precioUnitario: p.pvp,
                    cantidad: p.cantidad
                  })),
                  subtotalSinIva: totales.subtotalSinIva,
                  subtotalConIva: totales.subtotalConIva,
                  montoIva: totales.totalIva,
                  total: totales.total
                }} 
              />
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
