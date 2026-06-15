"use client";

import React, { useState } from "react";
import { ApolloProvider, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apolloClient";

const LISTAR_PROVEEDORES = gql`
  query ListarProveedores($buscar: String) {
    listarProveedores(buscar: $buscar) {
      id
      cedulaRuc
      nombre
      direccion
      telefono
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

function FacturaFormContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProveedor, setSelectedProveedor] = useState<any>(null);

  const [productos, setProductos] = useState([
    { descripcion: "", cantidad: 1, pvp: 0, grabaIva: true, porcentajeIva: 15 }
  ]);

  const handleAddProduct = () => {
    setProductos([...productos, { descripcion: "", cantidad: 1, pvp: 0, grabaIva: true, porcentajeIva: 15 }]);
  };

  const handleRemoveProduct = (index: number) => {
    setProductos(productos.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: string, value: any) => {
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

  const { data, loading, error } = useQuery<any>(LISTAR_PROVEEDORES, {
    variables: { buscar: searchTerm },
    skip: searchTerm.length < 2, // only search if at least 2 chars
  });

  const handleSelect = (proveedor: any) => {
    setSelectedProveedor(proveedor);
    setSearchTerm(proveedor.nombre); // or cedula
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100 mb-8 mt-6">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-4">
        Cabecera de Factura
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Proveedor</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none"
            placeholder="Cédula, RUC o Nombre..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedProveedor(null);
            }}
          />
          
          {/* Autocomplete Dropdown */}
          {searchTerm.length >= 2 && !selectedProveedor && data?.listarProveedores && data.listarProveedores.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {data.listarProveedores.map((prov: any) => (
                <li
                  key={prov.id}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b last:border-b-0 border-gray-100"
                  onClick={() => handleSelect(prov)}
                >
                  <div className="font-medium text-gray-800">{prov.nombre}</div>
                  <div className="text-xs text-gray-500 flex justify-between">
                    <span>{prov.cedulaRuc}</span>
                    <span>{prov.direccion}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {loading && <div className="text-sm text-gray-500 mt-1">Buscando...</div>}
          {error && <div className="text-sm text-red-500 mt-1">Error al buscar proveedores.</div>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cédula / RUC</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none"
            readOnly
            value={selectedProveedor?.cedulaRuc || ""}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none"
            readOnly
            value={selectedProveedor?.direccion || ""}
          />
        </div>
      </div>

      <div className="mt-8 border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Detalle de Productos</h3>
          <button
            type="button"
            data-testid="add-product-btn"
            onClick={handleAddProduct}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Agregar Producto
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 text-sm">
                <th className="p-3 border-b">Descripción</th>
                <th className="p-3 border-b w-24">Cantidad</th>
                <th className="p-3 border-b w-32">PVP</th>
                <th className="p-3 border-b w-24 text-center">Graba IVA</th>
                <th className="p-3 border-b w-32 text-right">Total</th>
                <th className="p-3 border-b w-16"></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((prod, index) => {
                const subtotal = roundToTwo(prod.cantidad * prod.pvp);
                return (
                  <tr key={index} data-testid={`product-row-${index}`} className="border-b text-sm">
                    <td className="p-3">
                      <input
                        type="text"
                        data-testid={`desc-${index}`}
                        className="w-full px-2 py-1 border rounded"
                        value={prod.descripcion}
                        onChange={(e) => updateProduct(index, "descripcion", e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        data-testid={`qty-${index}`}
                        className="w-full px-2 py-1 border rounded"
                        min="1"
                        value={prod.cantidad}
                        onChange={(e) => updateProduct(index, "cantidad", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        data-testid={`pvp-${index}`}
                        className="w-full px-2 py-1 border rounded"
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
                      />
                    </td>
                    <td className="p-3 text-right font-medium text-gray-700">
                      ${subtotal.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        data-testid={`remove-${index}`}
                        onClick={() => handleRemoveProduct(index)}
                        className="text-red-500 hover:text-red-700 font-bold"
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
          <div className="w-64 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-gray-600">Subtotal (Sin IVA):</span>
              <span data-testid="subtotal-sin-iva" className="font-medium">${totales.subtotalSinIva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-gray-600">Subtotal (Con IVA):</span>
              <span data-testid="subtotal-con-iva" className="font-medium">${totales.subtotalConIva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-gray-600">IVA (15%):</span>
              <span data-testid="total-iva" className="font-medium">${totales.totalIva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-gray-300 text-lg font-bold text-gray-800">
              <span>Total:</span>
              <span data-testid="total-general">${totales.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
