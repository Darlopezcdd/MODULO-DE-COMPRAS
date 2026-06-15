import prisma from '../lib/prisma';
import { GraphQLError } from 'graphql';

// Validations
const validateCedulaRuc = (val: string) => {
  if (!/^\d{10}$|^\d{13}$/.test(val)) throw new GraphQLError('Cédula/RUC inválido (debe tener 10 o 13 dígitos numéricos).');
};

const validateNombre = (val: string) => {
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(val)) throw new GraphQLError('El nombre no puede contener caracteres especiales ni números.');
};

const validateTelefono = (val: string) => {
  if (!/^[0-9+\-\s()]{7,20}$/.test(val)) throw new GraphQLError('Formato de teléfono inválido.');
};

const validateEmail = (val: string) => {
  if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(val)) throw new GraphQLError('Formato de correo inválido.');
};

const validateDireccion = (val: string) => {
  if (!val || val.trim() === '') throw new GraphQLError('La dirección no puede estar vacía.');
};

export const resolvers = {
  Query: {
    listarProveedores: async (_: any, { estado, tipo, buscar }: any) => {
      const where: any = { deletedAt: null };
      if (estado) where.estado = estado;
      if (tipo) where.tipo = tipo;
      if (buscar) {
        where.OR = [
          { nombre: { contains: buscar, mode: 'insensitive' } },
          { cedulaRuc: { contains: buscar } },
        ];
      }
      return await prisma.proveedor.findMany({ where, orderBy: { createdAt: 'desc' } });
    },
    obtenerProveedor: async (_: any, { id }: any) => {
      return await prisma.proveedor.findUnique({ where: { id, deletedAt: null } });
    },
  },
  Mutation: {
    crearProveedor: async (_: any, { input }: any) => {
      validateCedulaRuc(input.cedulaRuc);
      validateNombre(input.nombre);
      validateTelefono(input.telefono);
      validateEmail(input.email);
      validateDireccion(input.direccion);

      // CA2: Check if cedula exists
      const exists = await prisma.proveedor.findUnique({ where: { cedulaRuc: input.cedulaRuc } });
      if (exists) {
        throw new GraphQLError('Ya existe un proveedor con esta Cédula/RUC.');
      }

      return await prisma.proveedor.create({
        data: {
          ...input,
          created_by: 1
        },
      });
    },
    actualizarProveedor: async (_: any, { id, input }: any) => {
      if (input.nombre) validateNombre(input.nombre);
      if (input.telefono) validateTelefono(input.telefono);
      if (input.email) validateEmail(input.email);
      if (input.direccion) validateDireccion(input.direccion);

      return await prisma.proveedor.update({
        where: { id },
        data: input,
      });
    },
    eliminarProveedor: async (_: any, { id }: any) => {
      // CA3: Soft delete (cambiar estado a INACTIVO)
      return await prisma.proveedor.update({
        where: { id },
        data: {
          estado: 'INACTIVO',
          deletedAt: new Date(),
        },
      });
    },
  },
};
