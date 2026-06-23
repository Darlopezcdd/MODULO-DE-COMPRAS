"use client";

import React, { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";

const CREAR_PRODUCTO_GLOBAL_Y_CATALOGO = gql`
  mutation CrearProductoGlobalYCatalogo($proveedorId: Int!, $precioCompra: Float!, $input: ProductoGlobalInput!) {
    crearProductoGlobalYCatalogo(proveedorId: $proveedorId, precioCompra: $precioCompra, input: $input) {
      id
      productoCodigo
    }
  }
`;

interface NuevoProductoModalProps {
  proveedorId: number;
  onClose: () => void;
  onSuccess: (nuevoCodigo: string, nuevoNombre: string, precioCompra: number) => void;
}

export default function NuevoProductoModal({ proveedorId, onClose, onSuccess }: NuevoProductoModalProps) {
  const [crearProducto] = useMutation(CREAR_PRODUCTO_GLOBAL_Y_CATALOGO);
  
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    graba_iva: true,
    costo: 0,
    pvp: 0,
    estado: "Activo"
  });
  const [precioCompra, setPrecioCompra] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await crearProducto({
        variables: {
          proveedorId,
          precioCompra,
          input: {
            ...form,
            costo: Number(form.costo),
            pvp: Number(form.pvp)
          }
        }
      });
      onSuccess(form.codigo, form.nombre, precioCompra);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Crear Producto Nuevo</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded text-sm">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Código Único</label>
              <input required type="text" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" placeholder="Ej: PRD-0010" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre</label>
              <input required type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción / Categoría</label>
            <input type="text" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">PVP (Público)</label>
              <input required type="number" step="0.01" min="0" value={form.pvp} onChange={e => setForm({...form, pvp: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Graba IVA</label>
              <div className="pt-2">
                <input type="checkbox" checked={form.graba_iva} onChange={e => setForm({...form, graba_iva: e.target.checked})} className="w-5 h-5 accent-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg mt-4 border border-blue-100">
            <h4 className="text-sm font-bold text-blue-900 mb-2">Precio de Compra (Tu Proveedor)</h4>
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-bold">$</span>
              <input required type="number" step="0.01" min="0" value={precioCompra} onChange={e => setPrecioCompra(parseFloat(e.target.value) || 0)} className="w-32 px-3 py-2 border border-blue-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" />
              <span className="text-xs text-blue-600">Este precio se guardará en el catálogo del proveedor actual.</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50">
              {loading ? "Guardando..." : "Crear y Añadir a Catálogo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
