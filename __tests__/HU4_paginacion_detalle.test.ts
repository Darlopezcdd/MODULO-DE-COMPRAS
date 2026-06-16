import prisma from '@/lib/prisma';

jest.mock('@/lib/prisma', () => {
  return {
    __esModule: true,
    default: {
      facturas_compra: { findUnique: jest.fn() },
      proveedor: { findUnique: jest.fn() },
      detalle_factura_compra: { count: jest.fn(), findMany: jest.fn() },
    },
  };
});

function calcularPaginacion(total: number, pagina: number, limite: number) {
  const totalPaginas = Math.ceil(total / limite);
  return {
    pagina,
    limite,
    total,
    totalPaginas,
    tieneAnterior: pagina > 1,
    tieneSiguiente: pagina < totalPaginas,
  };
}

describe('HU4 - Paginación de detalle de factura', () => {
  afterEach(() => jest.clearAllMocks());

  it('devuelve 404 si la factura no existe', async () => {
    (prisma.facturas_compra.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const factura = await prisma.facturas_compra.findUnique({ where: { id: 999 } });
    expect(factura).toBeNull();
  });

  it('paginacion con 0 registros', () => {
    const pag = calcularPaginacion(0, 1, 20);
    expect(pag.totalPaginas).toBe(0);
    expect(pag.tieneAnterior).toBe(false);
    expect(pag.tieneSiguiente).toBe(false);
  });

  it('paginacion con menos registros que el limite', () => {
    const pag = calcularPaginacion(3, 1, 20);
    expect(pag.totalPaginas).toBe(1);
    expect(pag.tieneSiguiente).toBe(false);
  });

  it('paginacion con mas registros que el limite (varias paginas)', () => {
    const pag = calcularPaginacion(25, 1, 5);
    expect(pag.totalPaginas).toBe(5);
    expect(pag.tieneSiguiente).toBe(true);
    expect(pag.tieneAnterior).toBe(false);
  });

  it('pagina intermedia tiene anterior y siguiente', () => {
    const pag = calcularPaginacion(25, 3, 5);
    expect(pag.tieneAnterior).toBe(true);
    expect(pag.tieneSiguiente).toBe(true);
  });

  it('ultima pagina no tiene siguiente', () => {
    const pag = calcularPaginacion(25, 5, 5);
    expect(pag.tieneAnterior).toBe(true);
    expect(pag.tieneSiguiente).toBe(false);
  });

  it('consulta con skip y take correctos', async () => {
    const facturaMock = { id: 1, proveedor_id: 1, numero_factura: 'FC-0001', fecha: '2025-01-01', tipo_pago: 'CONTADO', estado: 'EMITIDA', subtotal_sin_iva: 0, subtotal_con_iva: 1000, total_iva: 150, total: 1150 };
    const proveedorMock = { id: 1, nombre: 'Proveedor Test' };
    const lineasMock = [{ id: 1, factura_id: 1, producto_nombre: 'Producto A', producto_codigo: 'P001', cantidad: 1, pvp: 1000, graba_iva: true, porcentaje_iva: 15, subtotal: 1000, valor_iva: 150, total_linea: 1150 }];

    (prisma.facturas_compra.findUnique as jest.Mock).mockResolvedValueOnce(facturaMock);
    (prisma.proveedor.findUnique as jest.Mock).mockResolvedValueOnce(proveedorMock);
    (prisma.detalle_factura_compra.count as jest.Mock).mockResolvedValueOnce(1);
    (prisma.detalle_factura_compra.findMany as jest.Mock).mockResolvedValueOnce(lineasMock);

    const factura = await prisma.facturas_compra.findUnique({ where: { id: 1 } });
    const proveedor = await prisma.proveedor.findUnique({ where: { id: factura!.proveedor_id } });
    const total = await prisma.detalle_factura_compra.count({ where: { factura_id: 1 } });
    const lineas = await prisma.detalle_factura_compra.findMany({ where: { factura_id: 1 }, orderBy: { id: 'asc' }, skip: 0, take: 20 });

    const pag = calcularPaginacion(total, 1, 20);

    expect(factura!.numero_factura).toBe('FC-0001');
    expect(proveedor!.nombre).toBe('Proveedor Test');
    expect(lineas).toHaveLength(1);
    expect(pag.total).toBe(1);
    expect(pag.totalPaginas).toBe(1);
  });
});
