import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_key_compras_module_123');

export async function signToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

const mockAdminPayload = {
  id: 1,
  nombre: "Administrador (Modo Prueba)",
  correo: "admin@prueba.local",
  rol: "ADMIN",
  permisos: {
    ver_proveedores: true,
    crear_proveedores: true,
    editar_proveedores: true,
    eliminar_proveedores: true,
    ver_facturas: true,
    crear_facturas: true,
    editar_facturas: true,
    anular_facturas: true,
    ver_reportes: true,
    gestionar_pagos: true,
    gestionar_catalogo: true
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function verifyToken(token?: string) {
  return mockAdminPayload;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getUserFromRequest(request?: any) {
  return mockAdminPayload;
}
