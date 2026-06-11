import { resolvers } from '@/graphql/resolvers';
import { GraphQLError } from 'graphql';

// Mock del Prisma Client
jest.mock('@/lib/prisma', () => {
  return {
    __esModule: true,
    default: {
      proveedor: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    },
  };
});

import prisma from '@/lib/prisma';

describe('GraphQL Resolvers - Proveedores', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crearProveedor (CA1 - CA2)', () => {
    const validArgs = {
      input: {
        cedulaRuc: '1234567890',
        nombre: 'Proveedor SA',
        ciudad: 'Quito',
        tipo: 'CONTADO',
        direccion: 'Calle 1',
        telefono: '0999999999',
        email: 'test@test.com'
      }
    };

    it('Falla si la cédula/RUC tiene formato inválido', async () => {
      try {
        await resolvers.Mutation.crearProveedor(null, { input: { ...validArgs.input, cedulaRuc: '123' } });
        throw new Error('Debió fallar');
      } catch (e: any) {
        expect(e.message).toContain('Cédula/RUC');
      }
    });

    it('Falla si el nombre tiene números o caracteres especiales', async () => {
      try {
        await resolvers.Mutation.crearProveedor(null, { input: { ...validArgs.input, nombre: 'Proveedor 123' } });
        throw new Error('Debió fallar');
      } catch (e: any) {
        expect(e.message).toContain('nombre');
      }
    });

    it('Falla si el teléfono es inválido', async () => {
      try {
        await resolvers.Mutation.crearProveedor(null, { input: { ...validArgs.input, telefono: 'abc' } });
        throw new Error('Debió fallar');
      } catch (e: any) {
        expect(e.message).toContain('teléfono');
      }
    });

    it('Falla si la cédula/RUC ya existe (CA2)', async () => {
      (prisma.proveedor.findUnique as jest.Mock).mockResolvedValueOnce({ id: 1 });
      try {
        await resolvers.Mutation.crearProveedor(null, validArgs);
        throw new Error('Debió fallar');
      } catch (e: any) {
        expect(e.message).toContain('Ya existe');
      }
    });

    it('Crea el proveedor exitosamente si los datos son válidos', async () => {
      (prisma.proveedor.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.proveedor.create as jest.Mock).mockResolvedValueOnce({ id: 1, ...validArgs.input });
      
      const res = await resolvers.Mutation.crearProveedor(null, validArgs);
      expect(res.id).toBe(1);
      expect(prisma.proveedor.create).toHaveBeenCalled();
    });
  });

  describe('eliminarProveedor (CA3)', () => {
    it('Realiza soft delete cambiando estado a INACTIVO', async () => {
      (prisma.proveedor.update as jest.Mock).mockResolvedValueOnce({ id: 1, estado: 'INACTIVO' });
      const res = await resolvers.Mutation.eliminarProveedor(null, { id: 1 });
      expect(res.estado).toBe('INACTIVO');
      expect(prisma.proveedor.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ estado: 'INACTIVO', deletedAt: expect.any(Date) })
      }));
    });
  });
});
