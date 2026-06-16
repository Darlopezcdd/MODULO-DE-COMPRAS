
/**
 * HU6 – Verificación de cálculo de saldos de crédito
 *         contra datos mock de Cuentas por Pagar
 *
 * CA1: Diseño de queries SQL de agregación (ver archivo SQL)
 * CA2: Verificación de que los saldos calculados coinciden
 *      con los datos mock provenientes de Cuentas por Pagar
 */

interface SaldoMock {
  proveedorId: number;
  proveedorNombre: string;
  totalFacturado: number;
  totalPagado: number;
  saldoPendiente: number;
  facturas: Array<{
    facturaId: number;
    numeroFactura: string;
    monto: number;
    pagado: number;
  }>;
}

interface CuentasPorPagarMock {
  cuentaId: number;
  proveedorId: number;
  montoOriginal: number;
  montoPagado: number;
  saldo: number;
}

const mockProveedores = [
  { id: 1, nombre: 'Distribuidora XYZ', tipo: 'CREDITO' as const },
  { id: 2, nombre: 'Comercial ABC', tipo: 'CREDITO' as const },
  { id: 3, nombre: 'Suministros Global', tipo: 'CONTADO' as const },
];

const mockFacturas = [
  { id: 1, proveedorId: 1, numeroFactura: 'FC-00000001', total: 1500.00, tipoPago: 'CREDITO' as const },
  { id: 2, proveedorId: 1, numeroFactura: 'FC-00000002', total: 2300.00, tipoPago: 'CREDITO' as const },
  { id: 3, proveedorId: 2, numeroFactura: 'FC-00000003', total: 800.00, tipoPago: 'CREDITO' as const },
  { id: 4, proveedorId: 3, numeroFactura: 'FC-00000004', total: 450.00, tipoPago: 'CONTADO' as const },
];

const mockCuentasPorPagar: CuentasPorPagarMock[] = [
  { cuentaId: 1, proveedorId: 1, montoOriginal: 1500.00, montoPagado: 1000.00, saldo: 500.00 },
  { cuentaId: 2, proveedorId: 1, montoOriginal: 2300.00, montoPagado: 2300.00, saldo: 0.00 },
  { cuentaId: 3, proveedorId: 2, montoOriginal: 800.00, montoPagado: 200.00, saldo: 600.00 },
  { cuentaId: 4, proveedorId: 3, montoOriginal: 450.00, montoPagado: 450.00, saldo: 0.00 },
];

function calcularSaldosMock(
  facturas: typeof mockFacturas,
  cuentasPorPagar: CuentasPorPagarMock[]
): SaldoMock[] {
  const saldosMap = new Map<number, SaldoMock>();

  for (const prov of mockProveedores) {
    if (prov.tipo !== 'CREDITO') continue;

    const facturasProveedor = facturas.filter((f) => f.proveedorId === prov.id);
    const cuentasProveedor = cuentasPorPagar.filter((c) => c.proveedorId === prov.id);

    const totalFacturado = facturasProveedor.reduce((sum, f) => sum + f.total, 0);
    const totalPagado = cuentasProveedor.reduce((sum, c) => sum + c.montoPagado, 0);
    const saldoPendiente = cuentasProveedor.reduce((sum, c) => sum + c.saldo, 0);

    saldosMap.set(prov.id, {
      proveedorId: prov.id,
      proveedorNombre: prov.nombre,
      totalFacturado,
      totalPagado,
      saldoPendiente,
      facturas: facturasProveedor.map((f) => {
        const cxp = cuentasProveedor.find((c) => c.cuentaId === f.id) || {
          montoPagado: 0,
          saldo: f.total,
        };
        return {
          facturaId: f.id,
          numeroFactura: f.numeroFactura,
          monto: f.total,
          pagado: cxp.montoPagado,
        };
      }),
    });
  }

  return Array.from(saldosMap.values());
}

const roundToTwo = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

describe('HU6 - Verificación de saldos de crédito contra Cuentas por Pagar', () => {
  let saldos: SaldoMock[];

  beforeAll(() => {
    saldos = calcularSaldosMock(mockFacturas, mockCuentasPorPagar);
  });

  it('solo debe incluir proveedores de tipo CREDITO', () => {
    const ids = saldos.map((s) => s.proveedorId);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).not.toContain(3);
  });

  it('Proveedor 1: debe tener saldo pendiente correcto (500.00)', () => {
    const saldo = saldos.find((s) => s.proveedorId === 1);
    expect(saldo).toBeDefined();
    expect(saldo!.totalFacturado).toBe(3800.00);
    expect(saldo!.totalPagado).toBe(3300.00);
    expect(saldo!.saldoPendiente).toBe(500.00);
  });

  it('Proveedor 2: debe tener saldo pendiente correcto (600.00)', () => {
    const saldo = saldos.find((s) => s.proveedorId === 2);
    expect(saldo).toBeDefined();
    expect(saldo!.totalFacturado).toBe(800.00);
    expect(saldo!.totalPagado).toBe(200.00);
    expect(saldo!.saldoPendiente).toBe(600.00);
  });

  it('Proveedor 3 (CONTADO) no debe aparecer en saldos de crédito', () => {
    const saldo = saldos.find((s) => s.proveedorId === 3);
    expect(saldo).toBeUndefined();
  });

  it('el saldo pendiente debe coincidir con la suma de saldos de Cuentas por Pagar', () => {
    for (const saldo of saldos) {
      const cuentasProv = mockCuentasPorPagar.filter(
        (c) => c.proveedorId === saldo.proveedorId
      );
      const sumaSaldoCxP = roundToTwo(cuentasProv.reduce((sum, c) => sum + c.saldo, 0));
      expect(saldo.saldoPendiente).toBeCloseTo(sumaSaldoCxP, 2);
    }
  });

  it('el total pagado no debe exceder el total facturado para ningún proveedor', () => {
    for (const saldo of saldos) {
      expect(saldo.totalPagado).toBeLessThanOrEqual(saldo.totalFacturado + 0.01);
    }
  });

  it('debe detectar diferencias cuando los montos no coinciden', () => {
    const cuentasModificadas: CuentasPorPagarMock[] = [
      ...mockCuentasPorPagar,
      { cuentaId: 5, proveedorId: 1, montoOriginal: 500.00, montoPagado: 0, saldo: 500.00 },
    ];

    const saldosConDiferencia = calcularSaldosMock(mockFacturas, cuentasModificadas);
    const prov1 = saldosConDiferencia.find((s) => s.proveedorId === 1);

    // Ahora habría 4300 facturado vs 500 adicional en CxP → diferencia detectada
    expect(prov1!.totalFacturado).toBe(3800.00);
    expect(prov1!.saldoPendiente).toBe(1000.00);
    expect(prov1!.saldoPendiente).not.toBeCloseTo(
      prov1!.totalFacturado - prov1!.totalPagado,
      2
    );
  });
});
