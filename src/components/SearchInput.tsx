'use client';

import React, { useState, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchInputProps {
  /** Placeholder del campo de búsqueda */
  placeholder?: string;
  /** Callback cuando cambia el valor (ya con debounce aplicado desde el padre) */
  onSearch: (query: string) => void;
  /** Indica si se está cargando la búsqueda */
  isLoading?: boolean;
  /** Clase CSS adicional para el contenedor */
  className?: string;
  /** Valor controlado externamente (opcional) */
  value?: string;
}

/**
 * Componente reutilizable de búsqueda avanzada.
 * Incluye ícono de búsqueda, botón de limpiar, y estados visuales
 * (vacío, escribiendo, cargando).
 * 
 * Sprint 3 — HU11: Buscadores Avanzados (Aldahir Requene)
 */
export default function SearchInput({
  placeholder = 'Buscar...',
  onSearch,
  isLoading = false,
  className = '',
  value: controlledValue,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Usar valor controlado si se proporciona
  const displayValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onSearch(newValue);
  };

  const handleClear = () => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onSearch('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className={`relative flex items-center group ${className}`}>
      {/* Ícono de búsqueda / Loader */}
      <div className="absolute left-3 flex items-center pointer-events-none">
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-[#d20a11] animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-slate-400 group-focus-within:text-[#d20a11] transition-colors" />
        )}
      </div>

      {/* Input de búsqueda */}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400
                   outline-none focus:ring-2 focus:ring-[#d20a11]/20 focus:border-[#d20a11]/50
                   transition-all duration-200 shadow-sm
                   hover:border-slate-300"
        aria-label={placeholder}
      />

      {/* Botón limpiar */}
      {displayValue && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 
                     transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Limpiar búsqueda"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
