// src/lib/facturaMath.ts

export const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const calculateLineaTotal = (cantidad: number, pvp: number): number => {
  return roundToTwo(cantidad * pvp);
};

export const calculateIva = (subtotal: number, porcentajeIva: number, grabaIva: boolean): number => {
  if (!grabaIva) return 0;
  return roundToTwo(subtotal * (porcentajeIva / 100));
};

export const calculateFacturaTotals = (
  lineas: Array<{
    cantidad: number;
    pvp: number;
    grabaIva: boolean;
    porcentajeIva: number;
  }>
) => {
  let subtotalSinIva = 0;
  let subtotalConIva = 0;
  let totalIva = 0;

  lineas.forEach((linea) => {
    const subtotalLinea = calculateLineaTotal(linea.cantidad, linea.pvp);
    const ivaLinea = calculateIva(subtotalLinea, linea.porcentajeIva, linea.grabaIva);

    if (linea.grabaIva) {
      subtotalConIva += subtotalLinea;
      totalIva += ivaLinea;
    } else {
      subtotalSinIva += subtotalLinea;
    }
  });

  const total = subtotalSinIva + subtotalConIva + totalIva;

  return {
    subtotalSinIva: roundToTwo(subtotalSinIva),
    subtotalConIva: roundToTwo(subtotalConIva),
    totalIva: roundToTwo(totalIva),
    total: roundToTwo(total),
  };
};
