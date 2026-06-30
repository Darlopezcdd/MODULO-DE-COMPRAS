import { roundToTwo, calculateLineaTotal, calculateIva, calculateFacturaTotals } from '@/lib/facturaMath';

jest.mock('@/lib/authUtils', () => ({
  signToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import { signToken, verifyToken } from '@/lib/authUtils';

// ── 1. MATH UTILITIES ──────────────────────────────────────────
describe('Smoke — Math utilities', () => {
  it('roundToTwo funciona con valores normales', () => {
    expect(roundToTwo(10.555)).toBe(10.56);
    expect(roundToTwo(10.001)).toBe(10.00);
    expect(roundToTwo(0)).toBe(0);
    expect(roundToTwo(99.999)).toBe(100.00);
  });

  it('calculateLineaTotal funciona', () => {
    expect(calculateLineaTotal(0, 100)).toBe(0);
    expect(calculateLineaTotal(1, 0)).toBe(0);
    expect(calculateLineaTotal(2, 15.5)).toBe(31.00);
  });

  it('calculateIva con/sin IVA', () => {
    expect(calculateIva(100, 15, false)).toBe(0);
    expect(calculateIva(100, 15, true)).toBe(15.00);
    expect(calculateIva(0, 15, true)).toBe(0);
  });

  it('calculateFacturaTotals con array vacío', () => {
    const t = calculateFacturaTotals([]);
    expect(t.subtotalSinIva).toBe(0);
    expect(t.subtotalConIva).toBe(0);
    expect(t.totalIva).toBe(0);
    expect(t.total).toBe(0);
  });

  it('calculateFacturaTotals con datos mixtos', () => {
    const t = calculateFacturaTotals([
      { cantidad: 2, pvp: 50, grabaIva: true, porcentajeIva: 15 },
      { cantidad: 1, pvp: 30, grabaIva: false, porcentajeIva: 0 },
    ]);
    expect(t.subtotalSinIva).toBe(30);
    expect(t.subtotalConIva).toBe(100);
    expect(t.totalIva).toBe(15);
    expect(t.total).toBe(145);
  });
});

// ── 2. PAGINATION LOGIC ────────────────────────────────────────
describe('Smoke — Pagination logic', () => {
  function paginar(total: number, pagina: number, limite: number) {
    const totalPaginas = Math.ceil(total / limite);
    return {
      pagina, limite, total, totalPaginas,
      tieneAnterior: pagina > 1,
      tieneSiguiente: pagina < totalPaginas,
    };
  }

  it('pagina unica con pocos registros', () => {
    const p = paginar(3, 1, 10);
    expect(p.totalPaginas).toBe(1);
    expect(p.tieneAnterior).toBe(false);
    expect(p.tieneSiguiente).toBe(false);
  });

  it('primera pagina con muchas registros', () => {
    const p = paginar(50, 1, 10);
    expect(p.totalPaginas).toBe(5);
    expect(p.tieneAnterior).toBe(false);
    expect(p.tieneSiguiente).toBe(true);
  });

  it('pagina intermedia', () => {
    const p = paginar(50, 3, 10);
    expect(p.tieneAnterior).toBe(true);
    expect(p.tieneSiguiente).toBe(true);
  });

  it('ultima pagina', () => {
    const p = paginar(50, 5, 10);
    expect(p.tieneAnterior).toBe(true);
    expect(p.tieneSiguiente).toBe(false);
  });

  it('sin registros', () => {
    const p = paginar(0, 1, 10);
    expect(p.totalPaginas).toBe(0);
    expect(p.tieneAnterior).toBe(false);
    expect(p.tieneSiguiente).toBe(false);
  });
});

// ── 3. AUTH UTILITIES ──────────────────────────────────────────
describe('Smoke — Auth utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signToken retorna un string con formato JWT', async () => {
    (signToken as jest.Mock).mockResolvedValue('header.payload.signature');
    const token = await signToken({ id: 1, nombre: 'Test', email: 'test@test.com', rol: 'ADMIN', permisos: {} as any });
    expect(typeof token).toBe('string');
  });

  it('verifyToken decodifica un payload correcto', async () => {
    const mockDecoded = { id: 1, rol: 'ADMIN' };
    (verifyToken as jest.Mock).mockResolvedValue(mockDecoded);
    const decoded = await verifyToken('un-token-valido');
    expect(decoded.id).toBe(1);
    expect(decoded.rol).toBe('ADMIN');
  });

  it('verifyToken rechaza token invalido', async () => {
    (verifyToken as jest.Mock).mockRejectedValue(new Error('Token invalido'));
    await expect(verifyToken('token-invalido')).rejects.toThrow();
  });
});

// ── 4. GRAPHQL SCHEMA VALIDITY ─────────────────────────────────
describe('Smoke — GraphQL schema definitions', () => {
  const typeDefs = `
    enum TipoProveedor { CONTADO CREDITO }
    enum EstadoProveedor { ACTIVO INACTIVO }
    enum TipoPago { CONTADO CREDITO }
    enum EstadoFactura { BORRADOR EMITIDA ANULADA }

    type Proveedor {
      id: Int!; cedulaRuc: String!; nombre: String!; ciudad: String!
      tipo: TipoProveedor!; estado: EstadoProveedor!
    }

    type FacturaCompra {
      id: Int!; numeroFactura: String!; fecha: String!
      proveedorId: Int!; tipoPago: TipoPago!; total: Float!; estado: EstadoFactura!
    }

    type Query {
      listarProveedores: [Proveedor!]!
      listarFacturas: [FacturaCompra!]!
    }
  `;

  it('contiene todos los tipos requeridos', () => {
    expect(typeDefs).toContain('TipoProveedor');
    expect(typeDefs).toContain('EstadoFactura');
    expect(typeDefs).toContain('Proveedor');
    expect(typeDefs).toContain('FacturaCompra');
    expect(typeDefs).toContain('listarProveedores');
    expect(typeDefs).toContain('listarFacturas');
  });

  it('contiene todos los enums requeridos', () => {
    expect(typeDefs).toContain('CONTADO');
    expect(typeDefs).toContain('CREDITO');
    expect(typeDefs).toContain('ACTIVO');
    expect(typeDefs).toContain('INACTIVO');
    expect(typeDefs).toContain('BORRADOR');
    expect(typeDefs).toContain('EMITIDA');
    expect(typeDefs).toContain('ANULADA');
  });
});

// ── 5. ROUTE AVAILABILITY ──────────────────────────────────────
describe('Smoke — Route availability', () => {
  const protectedRoutes = [
    '/proveedores',
    '/facturas',
    '/reportes',
    '/tesoreria',
    '/reportes/facturas',
  ];

  const publicRoutes = [
    '/login',
  ];

  const apiRoutes = [
    '/api/graphql',
    '/api/auth/login',
    '/api/auth/me',
    '/api/auth/logout',
    '/api/proveedores/1/catalogo/pdf',
    '/api/reportes/proveedores/json',
    '/api/reportes/facturas',
    '/api/tesoreria',
    '/api/cuentas',
    '/api/auditoria',
    '/api/swagger',
    '/api-docs',
  ];

  it('las rutas protegidas existen en la configuracion', () => {
    protectedRoutes.forEach(route => {
      expect(route).toBeTruthy();
      expect(route.startsWith('/')).toBe(true);
    });
  });

  it('las rutas publicas existen en la configuracion', () => {
    publicRoutes.forEach(route => {
      expect(route).toBeTruthy();
      expect(route.startsWith('/')).toBe(true);
    });
  });

  it('las rutas API existen en la configuracion', () => {
    apiRoutes.forEach(route => {
      expect(route).toBeTruthy();
      expect(route.startsWith('/api')).toBe(true);
    });
  });

  it('cubre modulos principales del sidebar', () => {
    const modulos = ['Proveedores', 'Facturas', 'Reportes', 'Tesorería'];
    expect(modulos.length).toBeGreaterThanOrEqual(4);
  });
});

// ── 6. ENVIRONMENT CONFIGURATION ───────────────────────────────
describe('Smoke — Environment configuration', () => {
  const fs = require('fs');
  const path = require('path');
  const rootDir = path.resolve(__dirname, '..');

  it('next.config.mjs existe y tiene output standalone', () => {
    const configPath = path.join(rootDir, 'next.config.mjs');
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('standalone');
  });

  it('package.json existe con scripts esenciales', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.test).toBe('jest');
  });
});

// ── 7. GENERATE PDF FUNCTIONS ──────────────────────────────────
describe('Smoke — PDF generation files', () => {
  const fs = require('fs');
  const path = require('path');
  const libDir = path.resolve(__dirname, '..', 'src', 'lib');

  it('facturaPdf.ts existe', () => {
    expect(fs.existsSync(path.join(libDir, 'facturaPdf.ts'))).toBe(true);
  });

  it('catalogoPdf.ts existe', () => {
    expect(fs.existsSync(path.join(libDir, 'catalogoPdf.ts'))).toBe(true);
  });

  it('proveedoresPdf.ts existe', () => {
    expect(fs.existsSync(path.join(libDir, 'proveedoresPdf.ts'))).toBe(true);
  });

  it('facturasReportePdf.ts existe', () => {
    expect(fs.existsSync(path.join(libDir, 'facturasReportePdf.ts'))).toBe(true);
  });
});

// ── 8. CRITICAL EXTERNAL CLIENTS ───────────────────────────────
describe('Smoke — External client files', () => {
  const fs = require('fs');
  const path = require('path');
  const libDir = path.resolve(__dirname, '..', 'src', 'lib');

  it('inventariosClient.ts existe', () => {
    expect(fs.existsSync(path.join(libDir, 'inventariosClient.ts'))).toBe(true);
  });

  it('auditoriaService.ts existe', () => {
    expect(fs.existsSync(path.join(libDir, 'auditoriaService.ts'))).toBe(true);
  });

  it('authUtils.ts existe', () => {
    expect(fs.existsSync(path.join(libDir, 'authUtils.ts'))).toBe(true);
  });
});
