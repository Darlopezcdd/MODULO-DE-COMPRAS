import { useState, useEffect, useMemo } from 'react';

export interface ItemFactura {
  id: string | number;
  cantidad: number;
  precioUnitario: number;
  descuento?: number; // Porcentaje o valor fijo, asumimos porcentaje (0-100) para este caso
  aplicaIva: boolean;
}

export interface TotalesFactura {
  subtotalSinIva: number;
  subtotalConIva: number;
  subtotal: number;
  montoIva: number;
  descuentoTotal: number;
  total: number;
}

export function useCalculosFactura(items: ItemFactura[], porcentajeIva: number = 15) {
  const totales = useMemo(() => {
    let subtotalSinIva = 0;
    let subtotalConIva = 0;
    let descuentoTotal = 0;

    items.forEach(item => {
      const subtotalItem = item.cantidad * item.precioUnitario;
      const descuentoItem = item.descuento ? subtotalItem * (item.descuento / 100) : 0;
      const totalItem = subtotalItem - descuentoItem;

      descuentoTotal += descuentoItem;

      if (item.aplicaIva) {
        subtotalConIva += totalItem;
      } else {
        subtotalSinIva += totalItem;
      }
    });

    const subtotal = subtotalSinIva + subtotalConIva;
    const montoIva = subtotalConIva * (porcentajeIva / 100);
    const total = subtotal + montoIva;

    return {
      subtotalSinIva,
      subtotalConIva,
      subtotal,
      montoIva,
      descuentoTotal,
      total
    };
  }, [items, porcentajeIva]);

  return totales;
}
