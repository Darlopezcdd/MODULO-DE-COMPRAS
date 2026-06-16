'use client';

import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

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

interface Proveedor {
  id: number;
  cedulaRuc: string;
  nombre: string;
  direccion: string;
  telefono: string;
}

interface AutocompleteProveedorProps {
  onSelect: (proveedor: Proveedor) => void;
  value?: string;
}

export default function AutocompleteProveedor({ onSelect, value }: AutocompleteProveedorProps) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const { data, loading, error } = useQuery(LISTAR_PROVEEDORES, {
    variables: { buscar: searchTerm },
    skip: searchTerm.length < 2,
  });

  if (error) console.error('Error en autocomplete:', error.message);

  const handleSelect = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor);
    setSearchTerm(proveedor.nombre);
    setShowDropdown(false);
    onSelect(proveedor);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedProveedor(null);
    setShowDropdown(true);
  };

  const proveedores = data?.listarProveedores || [];

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Proveedor</label>
      <input
        type="text"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm outline-none text-gray-900"
        placeholder="Cédula, RUC o Nombre..."
        value={searchTerm}
        onChange={handleChange}
        onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      {showDropdown && searchTerm.length >= 2 && !selectedProveedor && proveedores.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {proveedores.map((prov: Proveedor) => (
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
      {error && <div className="text-sm text-red-500 mt-1">Error: {error.message}</div>}
      {showDropdown && searchTerm.length >= 2 && !loading && !error && proveedores.length === 0 && !selectedProveedor && (
        <div className="text-sm text-gray-400 mt-1">No se encontraron proveedores.</div>
      )}
    </div>
  );
}
