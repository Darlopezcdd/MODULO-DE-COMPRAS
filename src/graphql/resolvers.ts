import prisma from '../lib/prisma';
import { GraphQLError } from 'graphql';

// Validations
const validateCedulaRuc = (val: string) => {
  if (!/^\d{10}(\d{3})?$/.test(val)) throw new GraphQLError('Cédula/RUC inválido (debe tener 10 o 13 dígitos numéricos).');
};

const validateNombre = (val: string) => {
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]{3,100}$/.test(val)) throw new GraphQLError('El nombre debe tener entre 3 y 100 caracteres y no puede contener caracteres especiales ni números.');
};

const validateCiudad = (val: string) => {
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s\-\.,]{3,50}$/.test(val)) throw new GraphQLError('La ciudad debe tener entre 3 y 50 caracteres y solo permite letras, espacios y algunos signos de puntuación.');
};

const validateTelefono = (val: string) => {
  if (!/^(0[1-9]\d{7,8}|\+?[1-9]\d{9,14})$/.test(val)) throw new GraphQLError('Formato de teléfono inválido.');
};

const validateEmail = (val: string) => {
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) throw new GraphQLError('Formato de correo inválido.');
};

const validateDireccion = (val: string) => {
  if (!/^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü\s\-\.,#]{5,200}$/.test(val)) throw new GraphQLError('La dirección debe tener entre 5 y 200 caracteres y puede contener números y letras.');
};

const validateFechasFactura = (emision: string, vencimiento?: string, tipoPago?: string) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaEmi = new Date(emision + 'T00:00:00');
  fechaEmi.setHours(0, 0, 0, 0);

  if (fechaEmi > hoy) {
    throw new GraphQLError('La fecha de emisión no puede ser futura');
  }

  if (tipoPago === 'CREDITO') {
    if (!vencimiento) {
      throw new GraphQLError('La fecha de vencimiento es obligatoria para crédito');
    }
    const fechaVen = new Date(vencimiento + 'T00:00:00');
    fechaVen.setHours(0, 0, 0, 0);

    if (fechaVen < fechaEmi) {
      throw new GraphQLError('La fecha de vencimiento no puede ser menor a la emisión');
    }
  }
};

export const resolvers = {
  Query: {
    listarProveedores: async (_: any, { estado, tipo }: any) => {
      const where: any = { deletedAt: null };
      if (estado) where.estado = estado;
      if (tipo) where.tipo = tipo;
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
      validateCiudad(input.ciudad);
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
      if (input.ciudad) validateCiudad(input.ciudad);
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
    crearFactura: async (_: any, { input }: any) => {
      validateFechasFactura(input.fecha, input.fecha_vencimiento, input.tipo_pago);
      
      return await prisma.facturas_compra.create({
        data: {
          ...input,
          created_by: 1
        }
      });
    },
  },
};
