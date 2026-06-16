import { renderHook } from '@testing-library/react';
import { useCalculosFactura, ItemFactura } from '../src/hooks/useCalculosFactura';

describe('useCalculosFactura', () => {
  it('calcula los totales correctamente con items sin y con IVA', () => {
    const items: ItemFactura[] = [
      { id: 1, cantidad: 2, precioUnitario: 10, descuento: 0, aplicaIva: true }, // 20 + 15% IVA = 23
      { id: 2, cantidad: 1, precioUnitario: 50, descuento: 10, aplicaIva: false }, // 50 - 10% = 45 (Sin IVA)
    ];

    const { result } = renderHook(() => useCalculosFactura(items, 15));

    expect(result.current.subtotalConIva).toBe(20);
    expect(result.current.subtotalSinIva).toBe(45);
    expect(result.current.subtotal).toBe(65);
    expect(result.current.descuentoTotal).toBe(5);
    expect(result.current.montoIva).toBe(3); // 15% de 20
    expect(result.current.total).toBe(68); // 65 + 3
  });

  it('calcula totales cuando no hay items', () => {
    const { result } = renderHook(() => useCalculosFactura([]));

    expect(result.current.subtotalConIva).toBe(0);
    expect(result.current.subtotalSinIva).toBe(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.descuentoTotal).toBe(0);
    expect(result.current.montoIva).toBe(0);
    expect(result.current.total).toBe(0);
  });
});
