import { useState, useEffect } from 'react';

/**
 * Hook personalizado para debounce de valores.
 * Retrasa la actualización del valor hasta que el usuario deje de escribir.
 * 
 * @param value - Valor a hacer debounce
 * @param delay - Tiempo de espera en milisegundos (default: 400ms)
 * @returns El valor con debounce aplicado
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
