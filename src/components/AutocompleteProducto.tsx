'use client';

import { useState, useEffect, useRef } from 'react';

interface ProductoResult {
  codigo: string;
  nombre: string;
  descripcion: string;
  stockActual: number;
  precioUnitario: number;
  grabaIva: boolean;
  porcentajeIva: number;
}

interface AutocompleteProductoProps {
  onSelect: (producto: ProductoResult) => void;
  value?: string;
}

export default function AutocompleteProducto({ onSelect, value }: AutocompleteProductoProps) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [productos, setProductos] = useState<ProductoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setProductos([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/inventarios?termino=${encodeURIComponent(searchTerm)}&limite=10`);
        const body = await res.json();
        const items = body.data ?? [];
        setProductos(items);
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setDropdownStyle({
            position: 'fixed',
            zIndex: 9999,
            top: `${rect.bottom + 4}px`,
            left: `${rect.left}px`,
            width: `${Math.max(rect.width, 320)}px`,
          });
        }
        setOpen(true);
      } catch (e) {
        console.error('Error fetching products:', e);
        setProductos([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleScroll() { setOpen(false); }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const handleSelect = (producto: ProductoResult) => {
    setSearchTerm(`${producto.codigo} - ${producto.nombre}`);
    setOpen(false);
    onSelect(producto);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        className="w-full px-2 py-1 border rounded text-gray-900"
        placeholder="Buscar producto..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
        }}
      />
      {open && searchTerm.length >= 2 && productos.length > 0 && (
        <ul
          style={{
            ...dropdownStyle,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            maxHeight: '240px',
            overflow: 'auto',
          }}
        >
          {loading && (
            <li style={{ padding: '8px 16px', fontSize: '14px', color: '#6b7280' }}>Buscando...</li>
          )}
          {!loading && productos.map((prod) => (
            <li
              key={prod.codigo}
              onMouseDown={() => handleSelect(prod)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6',
                color: '#111827',
                fontSize: '14px',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#eff6ff'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = ''; }}
            >
              <div style={{ fontWeight: 500 }}>{prod.nombre}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                <span>{prod.codigo}</span>
                <span>Stock: {prod.stockActual} | ${prod.precioUnitario.toFixed(2)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && searchTerm.length >= 2 && !loading && productos.length === 0 && (
        <div style={{
          ...dropdownStyle,
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          color: '#9ca3af',
        }}>
          Sin resultados
        </div>
      )}
    </div>
  );
}
