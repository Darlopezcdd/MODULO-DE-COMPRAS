import { resolvers } from '@/graphql/resolvers';
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });
import { GraphQLError } from 'graphql';

jest.mock('@/lib/authUtils', () => ({
  getUserFromRequest: jest.fn().mockResolvedValue(null)
}));

jest.mock('@/lib/auditoriaCentralClient', () => ({
  logAccionCentral: jest.fn(),
}));

// ── Mock de Prisma ────────────────────────────────────────────────────────────
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    proveedor: {
      findUnique: jest.fn(),
    },
    facturas_compra: {
      create: jest.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

// ── Datos base de prueba ──────────────────────────────────────────────────────
const proveedorCreditoActivo = {
  id: 1,
  nombre: 'Proveedor Crédito SA',
  tipo: 'CREDITO',
  estado: 'ACTIVO',
  deletedAt: null,
};

const proveedorContadoActivo = {
  id: 2,
  nombre: 'Proveedor Contado SA',
  tipo: 'CONTADO',
  estado: 'ACTIVO',
  deletedAt: null,
};

const hoy = new Date();
const formatLocalDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const fechaHoy = formatLocalDate(hoy);

const fechaManana = new Date(hoy);
fechaManana.setDate(fechaManana.getDate() + 1);
const fechaMananaStr = formatLocalDate(fechaManana);

const fechaVence = new Date(hoy);
fechaVence.setDate(fechaVence.getDate() + 30);
const fechaVenceStr = formatLocalDate(fechaVence);

const inputBase = {
  fecha: fechaHoy,
  proveedorId: 1,
  tipoPago: 'CONTADO' as const,
  fechaVencimiento: undefined,
  observaciones: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('GraphQL Resolvers — HU2: crearFacturaCabecera', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── CA1: Fecha no futura ────────────────────────────────────────────────────
  describe('CA1 — Fecha no puede ser futura', () => {
    it('Lanza error si la fecha de la factura es futura', async () => {
      await expect(
        resolvers.Mutation.crearFacturaCabecera(null, {
          input: { ...inputBase, fecha: fechaMananaStr },
        }, {})
      ).rejects.toThrow('CA1');
    });
  });

  // ── CA2: Proveedor existe y está ACTIVO ────────────────────────────────────
  describe('CA2 — Proveedor debe existir y estar ACTIVO', () => {
    it('Lanza error si el proveedor no existe', async () => {
      (prisma.proveedor.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        resolvers.Mutation.crearFacturaCabecera(null, { input: inputBase }, {})
      ).rejects.toThrow('CA2');
    });

    it('Lanza error si el proveedor está INACTIVO', async () => {
      (prisma.proveedor.findUnique as jest.Mock).mockResolvedValueOnce({
        ...proveedorContadoActivo,
        estado: 'INACTIVO',
      });
      await expect(
        resolvers.Mutation.crearFacturaCabecera(null, { input: inputBase }, {})
      ).rejects.toThrow('CA2');
    });
  });

  // ── CA3: Permiso de Crédito ────────────────────────────────────────────────
  describe('CA3 — Solo proveedores tipo CREDITO pueden usar tipoPago CREDITO', () => {
    it('Lanza error si proveedor CONTADO intenta crear factura a CREDITO', async () => {
      (prisma.proveedor.findUnique as jest.Mock).mockResolvedValueOnce(proveedorContadoActivo);
      await expect(
        resolvers.Mutation.crearFacturaCabecera(null, {
          input: { ...inputBase, proveedorId: 2, tipoPago: 'CREDITO', fechaVencimiento: fechaVenceStr },
        }, {})
      ).rejects.toThrow('CA3');
    });
  });

  // ── CA4: fechaVencimiento obligatoria en CREDITO ───────────────────────────
  describe('CA4 — fechaVencimiento requerida para CREDITO', () => {
    it('Lanza error si tipoPago es CREDITO y no se envía fechaVencimiento', async () => {
      (prisma.proveedor.findUnique as jest.Mock).mockResolvedValueOnce(proveedorCreditoActivo);
      await expect(
        resolvers.Mutation.crearFacturaCabecera(null, {
          input: { ...inputBase, tipoPago: 'CREDITO', fechaVencimiento: undefined },
        }, {})
      ).rejects.toThrow('CA4');
    });
  });

  // ── CA5: fechaVencimiento debe ser posterior a fecha ──────────────────────
  describe('CA5 — fechaVencimiento debe ser posterior a la fecha de emisión', () => {
    it('Lanza error si fechaVencimiento es igual o anterior a la fecha de emisión', async () => {
      (prisma.proveedor.findUnique as jest.Mock).mockResolvedValueOnce(proveedorCreditoActivo);
      await expect(
        resolvers.Mutation.crearFacturaCabecera(null, {
          input: { ...inputBase, tipoPago: 'CREDITO', fechaVencimiento: fechaHoy }, // mismo día
        }, {})
      ).rejects.toThrow('CA5');
    });
  });

  // ── Casos de éxito ─────────────────────────────────────────────────────────
  describe('Éxito — Creación válida de factura', () => {
    it('CA6: Crea factura CONTADO sin fecha de vencimiento', async () => {
      (prisma.proveedor.findUnique as jest.Mock).mockResolvedValueOnce(proveedorContadoActivo);
      (prisma.facturas_compra.create as jest.Mock).mockResolvedValueOnce({
        id: 10,
        numero_factura: 'FC-00000010',
        numero_factura_proveedor: null,
        fecha: new Date(fechaHoy),
        proveedor_id: 2,
        tipo_pago: 'CONTADO',
        fecha_vencimiento: null,
        subtotal_sin_iva: 0,
        subtotal_con_iva: 0,
        total_iva: 0,
        total: 0,
        estado: 'BORRADOR',
        observaciones: null,
      });

      const res = await resolvers.Mutation.crearFacturaCabecera(null, {
        input: { ...inputBase, proveedorId: 2, tipoPago: 'CONTADO' },
      }, {});

      expect(res.estado).toBe('BORRADOR');
      expect(res.fechaVencimiento).toBeNull();
      expect(res.tipoPago).toBe('CONTADO');
      // CA6: el create se llamó con fecha_vencimiento: null
      expect(prisma.facturas_compra.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ fecha_vencimiento: null }) })
      );
    });

    it('Crea factura CREDITO válida con fechaVencimiento posterior', async () => {
      (prisma.proveedor.findUnique as jest.Mock).mockResolvedValueOnce(proveedorCreditoActivo);
      (prisma.facturas_compra.create as jest.Mock).mockResolvedValueOnce({
        id: 11,
        numero_factura: 'FC-00000011',
        numero_factura_proveedor: 'PROV-001',
        fecha: new Date(fechaHoy),
        proveedor_id: 1,
        tipo_pago: 'CREDITO',
        fecha_vencimiento: new Date(fechaVenceStr),
        subtotal_sin_iva: 0,
        subtotal_con_iva: 0,
        total_iva: 0,
        total: 0,
        estado: 'BORRADOR',
        observaciones: null,
      });

      const res = await resolvers.Mutation.crearFacturaCabecera(null, {
        input: {
          ...inputBase,
          tipoPago: 'CREDITO',
          fechaVencimiento: fechaVenceStr,
          numeroFacturaProveedor: 'PROV-001',
        },
      }, {});

      expect(res.estado).toBe('BORRADOR');
      expect(res.tipoPago).toBe('CREDITO');
      expect(res.fechaVencimiento).toBe(fechaVenceStr);
      expect(prisma.facturas_compra.create).toHaveBeenCalled();
    });
  });
});
