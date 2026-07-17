"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, ApolloProvider } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apolloClient";
import AutocompleteProducto from "./AutocompleteProducto";
import NuevoProductoModal from "./NuevoProductoModal";
import * as XLSX from 'xlsx';
import { AlertTriangle, X, Edit2, Check, X as XIcon } from 'lucide-react';
import AlertBanner from "@/components/AlertBanner";
import ConfirmModal from "@/components/ConfirmModal";
import Tooltip from "@/components/Tooltip";

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
  mutation AgregarAlCatalogo($proveedorId: Int!, $productoCodigo: String!, $precioCompra: Float!, $pvp: Float) {
    agregarAlCatalogo(proveedorId: $proveedorId, productoCodigo: $productoCodigo, precioCompra: $precioCompra, pvp: $pvp) {
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
  canManage?: boolean;
}

export default function CatalogoProveedorModalWrapper(props: CatalogoModalProps) {
  return (
    <ApolloProvider client={apolloClient}>
      <CatalogoProveedorModal {...props} />
    </ApolloProvider>
  );
}

function CatalogoProveedorModal({ proveedorId, proveedorNombre, onClose, canManage = false }: CatalogoModalProps) {
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
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, productoId: number | null}>({ isOpen: false, productoId: null });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  
  // Estado para el toast de aviso
  const [aviso, setAviso] = useState<{ mensaje: string; tipo: 'warning' | 'success' } | null>(null);

  const mostrarAviso = (mensaje: string, tipo: 'warning' | 'success') => {
    setAviso({ mensaje, tipo });
    setTimeout(() => setAviso(null), 3500);
  };

  // Estado para la seleccion inline
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [precioInput, setPrecioInput] = useState<string>("");

  // Estado para edición en línea
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editPrecio, setEditPrecio] = useState<string>("");
  const [editCodigo, setEditCodigo] = useState<string>("");

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

  const handleEliminar = (id: number) => {
    setConfirmModal({ isOpen: true, productoId: id });
  };

  const procesarEliminacion = async () => {
    const id = confirmModal.productoId;
    setConfirmModal({ isOpen: false, productoId: null });
    if (!id) return;
    
    try {
      await eliminar({ variables: { id } });
      refetch();
    } catch (e: any) {
      mostrarAviso("Error al eliminar: " + e.message, 'warning');
    }
  };

  const handleAddFromAutocomplete = (prod: any) => {
    setProductoSeleccionado(prod);
    setPrecioInput("");
  };

  
  
  const handleEditarSubmit = async () => {
    if (!editingItem) return;
    const numPrecio = parseFloat(editPrecio) || 0;
    if (numPrecio <= 0) {
      mostrarAviso("El precio de compra debe ser mayor a 0", "warning");
      return;
    }

    try {
      if (editingItem.productoCodigo !== editCodigo) {
        // Si el codigo cambió, eliminamos el registro anterior
        await eliminar({ variables: { id: editingItem.id } });
      }

      await agregar({
        variables: {
          proveedorId,
          productoCodigo: editCodigo,
          precioCompra: numPrecio
        }
      });
      setEditingItem(null);
      setEditPrecio("");
      setEditCodigo("");
      refetch();
      mostrarAviso("Producto actualizado correctamente", "success");
    } catch (e: any) {
      mostrarAviso("Error al actualizar: " + e.message, "warning");
    }
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

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingExcel(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Buscar dinámicamente en qué fila están las cabeceras (dentro de las primeras 20 filas)
      const rawRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
        const row = rawRows[i];
        if (row && Array.isArray(row)) {
          const hasCodigoExacto = row.some(c => {
            const val = String(c).trim().toLowerCase();
            return val === 'codigo' || val === 'código' || val === 'codigo producto';
          });
          if (hasCodigoExacto) {
            headerRowIndex = i;
            break;
          }
        }
      }

      // Procesar desde la fila de cabeceras
      const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { range: headerRowIndex });
      
      let procesados = 0;
      let errores = 0;
      
      for (const row of rows) {
        // Buscar las columnas por nombres comunes
        const codigo = row.codigo || row.Codigo || row.CodigoProducto || row.codigoProducto || row['Código'];
        const precioVal = row.precioCompra || row.PrecioCompra || row.Precio || row.precio || row['Precio Compra'];
        const pvpVal = row.pvp || row.PVP || row['PVP'] || row['PVP (Inventario)'] || row['Precio Venta'];
        
        const precio = parseFloat(String(precioVal).replace(',', '.'));
        const pvpNum = pvpVal !== undefined && pvpVal !== null ? parseFloat(String(pvpVal).replace(',', '.')) : undefined;
        
        if (codigo && !isNaN(precio) && precio > 0) {
          try {
            await agregar({
              variables: {
                proveedorId,
                productoCodigo: String(codigo),
                precioCompra: precio,
                pvp: !isNaN(pvpNum as number) && (pvpNum as number) > 0 ? pvpNum : undefined
              }
            });
            procesados++;
          } catch (err) {
            console.error("Error agregando fila:", row, err);
            errores++;
          }
        } else {
          errores++;
        }
      }
      
      if (errores === 0 && procesados > 0) {
        mostrarAviso(`Carga finalizada. Insertados/Actualizados: ${procesados}.`, 'success');
      } else if (procesados > 0 && errores > 0) {
        mostrarAviso(`Carga con errores. Insertados: ${procesados}. Fallidos/Ignorados: ${errores}.`, 'warning');
      } else {
        mostrarAviso(`No se insertó ningún producto. Revise el formato. Filas ignoradas: ${errores}`, 'warning');
      }
      
      refetch();
    } catch (error) {
      console.error(error);
      mostrarAviso('Error procesando el archivo Excel.', 'warning');
    } finally {
      setIsUploadingExcel(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    const ws_data = [
      ["--- INSTRUCCIONES PARA LLENAR EL CATÁLOGO ---"],
      ["1. Reemplace los ejemplos con sus productos reales."],
      ["2. Las columnas 'Codigo' y 'Precio Compra' son obligatorias. El nombre es solo para su guía."],
      ["3. La columna 'PVP (Inventario)' es OPCIONAL. Si la llena, el precio de venta se actualizará automáticamente en el Inventario Global."],
      ["4. No use símbolos de dólar ($) y use punto (.) para los decimales. Los productos se leen desde la Fila 7 hacia abajo."],
      [], // Fila 6 vacía para separación visual
      ["Codigo", "Producto (Opcional)", "Precio Compra", "PVP (Inventario)"],
      ["EJ-001", "Lapiz HB", 15.50, 20.00],
      ["EJ-002", "Borrador de Queso", 25.00, 35.00]
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Dar un poco de estilo básico de anchos de columna
    worksheet['!cols'] = [ 
      { wch: 15 }, // Codigo
      { wch: 30 }, // Producto (Opcional)
      { wch: 15 }, // Precio Compra
      { wch: 20 }  // PVP (Inventario)
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla_Catalogo");
    XLSX.writeFile(workbook, "plantilla_catalogo.xlsx");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Catálogo de Proveedor</h3>
            <p className="text-sm text-slate-500">{proveedorNombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">✕</button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50 relative">

          {aviso && (
            <div className="absolute top-4 left-6 right-6 z-50">
              <AlertBanner
                type={aviso.tipo}
                message={aviso.mensaje}
                onClose={() => setAviso(null)}
                autoCloseMs={3500}
                className="shadow-xl border-l-4"
              />
            </div>
          )}
          
          <div className="mb-6 p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 border-b border-slate-100 pb-4">
              <h4 className="text-base font-semibold text-slate-800 shrink-0">Productos del proveedor</h4>
              <div className="flex flex-wrap items-center gap-2">
                {canManage && (
                  <>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept=".xlsx, .xls, .csv" 
                      className="hidden" 
                      onChange={handleExcelUpload} 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingExcel}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {isUploadingExcel ? 'Procesando Excel...' : '↑ Cargar Excel'}
                    </button>
                    <button 
                      onClick={handleDownloadTemplate}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition"
                      title="Descargar plantilla de Excel"
                    >
                      ↓ Plantilla Excel
                    </button>
                  </>
                )}
                <button 
                  onClick={() => {
                    if (productosFull.length === 0) {
                      mostrarAviso('El catálogo de este proveedor está vacío. Agregue productos antes de imprimir.', 'warning');
                      return;
                    }
                    window.open(`/api/proveedores/${proveedorId}/catalogo/pdf`, '_blank');
                  }}
                  className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-lg transition"
                >
                  Imprimir PDF
                </button>
                {canManage && (
                  <button 
                    onClick={() => setShowNuevoProducto(true)}
                    className="text-sm font-medium text-[#d20a11] hover:text-red-700 flex items-center gap-1 bg-[#d20a11]/10 px-3 py-1.5 rounded-lg transition"
                  >
                    + Crear Producto Nuevo
                  </button>
                )}
              </div>
            </div>
            
            {canManage && (
              !productoSeleccionado ? (
                <div className="w-full">
                  <AutocompleteProducto 
                    onSelect={handleAddFromAutocomplete} 
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-[#d20a11]/10 p-3 rounded-lg border border-[#d20a11]/20">
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
                        className="w-28 pl-7 pr-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#d20a11] outline-none transition"
                        value={precioInput}
                        onChange={(e) => setPrecioInput(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                    <button 
                      onClick={confirmarAgregar}
                      className="bg-[#d20a11] hover:bg-red-700 text-white px-4 py-1.5 rounded-md font-medium text-sm shadow-sm transition"
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
              )
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
                  {canManage && <th className="p-3 font-semibold text-center w-24">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading || cargandoDetalles ? (
                  <tr><td colSpan={canManage ? 5 : 4} className="p-8 text-center text-slate-400">Cargando catálogo...</td></tr>
                ) : productosFull.length === 0 ? (
                  <tr><td colSpan={canManage ? 5 : 4} className="p-8 text-center text-slate-400">Este proveedor no tiene productos en su catálogo aún.</td></tr>
                ) : (
                  productosFull.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 text-sm">
                      {editingItem?.id === item.id ? (
                        <td colSpan={2} className="p-2 relative z-[9999]">
                           <AutocompleteProducto 
                             value={`${editCodigo} - ${item.nombre}`}
                             onSelect={(prod) => {
                               setEditCodigo(prod.codigo);
                             }}
                           />
                        </td>
                      ) : (
                        <>
                          <td className="p-3 font-mono text-slate-500">{item.productoCodigo}</td>
                          <td className="p-3 font-medium text-slate-900">{item.nombre}</td>
                        </>
                      )}
                      <td className="p-3 text-slate-600">{item.stockActual}</td>
                      {editingItem?.id === item.id ? (
                        <td className="p-3 text-right">
                          <input 
                            type="number" 
                            step="0.01" 
                            className="w-24 px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none text-right"
                            value={editPrecio}
                            onChange={(e) => setEditPrecio(e.target.value)}
                            autoFocus
                          />
                        </td>
                      ) : (
                        <td className="p-3 text-right font-bold text-[#d20a11]">${item.precioCompra.toFixed(2)}</td>
                      )}
                      
                      {canManage && (
                        <td className="p-3 text-center">
                          {editingItem?.id === item.id ? (
                            <div className="flex justify-center gap-2">
                              <Tooltip content="Guardar cambios" position="top">
                                <button 
                                  onClick={handleEditarSubmit}
                                  className="text-emerald-600 hover:text-emerald-800 p-1 bg-emerald-50 hover:bg-emerald-100 rounded transition"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              <Tooltip content="Cancelar edición" position="top">
                                <button 
                                  onClick={() => setEditingItem(null)}
                                  className="text-slate-500 hover:text-slate-700 p-1 bg-slate-100 hover:bg-slate-200 rounded transition"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <Tooltip content="Editar precio de compra" position="top">
                                <button 
                                  onClick={() => {
                                    setEditingItem(item);
                                    setEditPrecio(item.precioCompra.toString());
                                    setEditCodigo(item.productoCodigo);
                                  }}
                                  className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 hover:bg-blue-100 rounded transition"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              <Tooltip content="Quitar producto del catálogo" position="top">
                                <button 
                                  onClick={() => handleEliminar(item.id)}
                                  className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded transition"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title="Quitar producto"
          message="¿Estás seguro de que deseas quitar este producto de tu catálogo? Ya no podrás usarlo para facturar a este proveedor."
          type="danger"
          confirmText="Quitar"
          cancelText="Cancelar"
          onConfirm={procesarEliminacion}
          onCancel={() => setConfirmModal({ isOpen: false, productoId: null })}
        />
      </div>
    </div>
  );
}
