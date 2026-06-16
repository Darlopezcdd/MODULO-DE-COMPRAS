import { calculateLineaTotal, calculateIva, calculateFacturaTotals, roundToTwo } from '../src/lib/facturaMath';

describe('facturaMath', () => {
  describe('roundToTwo', () => {
    it('debería redondear a dos decimales correctamente', () => {
      expect(roundToTwo(10.555)).toBe(10.56);
      expect(roundToTwo(10.554)).toBe(10.55);
      expect(roundToTwo(10)).toBe(10.00);
    });
  });

  describe('calculateLineaTotal', () => {
    it('debería multiplicar cantidad por pvp', () => {
      expect(calculateLineaTotal(2, 15.5)).toBe(31.00);
      expect(calculateLineaTotal(3.5, 10)).toBe(35.00);
    });
  });

  describe('calculateIva', () => {
    it('debería retornar 0 si no graba IVA', () => {
      expect(calculateIva(100, 15, false)).toBe(0);
    });

    it('debería calcular el IVA correctamente si graba IVA', () => {
      expect(calculateIva(100, 15, true)).toBe(15.00);
      expect(calculateIva(55.5, 12, true)).toBe(6.66);
    });
  });

  describe('calculateFacturaTotals', () => {
    it('debería calcular los totales generales correctamente para múltiples líneas', () => {
      const lineas = [
        { cantidad: 2, pvp: 50, grabaIva: true, porcentajeIva: 15 }, // Subtotal: 100, IVA: 15
        { cantidad: 1, pvp: 30, grabaIva: false, porcentajeIva: 0 }, // Subtotal: 30, IVA: 0
        { cantidad: 3, pvp: 10.5, grabaIva: true, porcentajeIva: 15 }, // Subtotal: 31.5, IVA: 4.73
      ];

      const totales = calculateFacturaTotals(lineas);

      expect(totales.subtotalSinIva).toBe(30.00);
      expect(totales.subtotalConIva).toBe(131.50);
      expect(totales.totalIva).toBe(19.72); // 15 + 4.725 rounded -> 4.72 => 19.72
      expect(totales.total).toBe(181.22); // 30 + 131.50 + 19.72 = 181.22
    });
  });
});
