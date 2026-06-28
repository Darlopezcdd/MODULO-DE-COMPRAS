import { NextResponse } from 'next/server';
import { signToken } from '../../../../lib/authUtils';

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica al usuario con email y contraseña. Devuelve un token JWT como cookie httpOnly.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioLogin'
 *     responses:
 *       200:
 *         description: Login exitoso. Se establece la cookie `auth-token`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *         headers:
 *           Set-Cookie:
 *             description: Cookie httpOnly con el token JWT
 *             schema:
 *               type: string
 *               example: auth-token=eyJhbGciOiJIUzI1NiJ9...; Path=/; HttpOnly
 *       400:
 *         description: Credenciales incompletas (falta email o password)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Usuario no encontrado, inactivo o contraseña incorrecta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: Request) {
  try {
    const { rol } = await request.json();

    if (!rol || !['ADMIN', 'COMPRADOR', 'GESTOR_PROVEEDORES', 'TESORERO', 'AUDITOR'].includes(rol)) {
      return NextResponse.json({ error: 'Rol inválido o no proporcionado' }, { status: 400 });
    }

    // Definir permisos dinámicos basados en el rol (Simulando lo que haría el Módulo de Seguridad)
    let permisos = {
      ver_proveedores: false,
      crear_proveedores: false,
      editar_proveedores: false,
      gestionar_catalogo: false,
      ver_facturas: false,
      crear_facturas: false,
      puede_anular: false,
      ver_reportes: false,
      gestionar_pagos: false,
      ver_auditoria: false,
    };

    if (rol === 'ADMIN') {
      permisos = {
        ver_proveedores: true,
        crear_proveedores: true,
        editar_proveedores: true,
        gestionar_catalogo: true,
        ver_facturas: true,
        crear_facturas: true,
        puede_anular: true,
        ver_reportes: true,
        gestionar_pagos: true,
        ver_auditoria: true,
      };
    } else if (rol === 'AUDITOR') {
      permisos = {
        ...permisos,
        ver_proveedores: true,
        ver_facturas: true,
        ver_reportes: true,
        ver_auditoria: true,
      };
    } else if (rol === 'COMPRADOR') {
      permisos = {
        ...permisos,
        ver_proveedores: true,
        ver_facturas: true,
        crear_facturas: true,
      };
    } else if (rol === 'GESTOR_PROVEEDORES') {
      permisos = {
        ...permisos,
        ver_proveedores: true,
        crear_proveedores: true,
        editar_proveedores: true,
        gestionar_catalogo: true,
      };
    } else if (rol === 'TESORERO') {
      permisos = {
        ...permisos,
        ver_proveedores: true,
        ver_facturas: true,
        ver_reportes: true,
        gestionar_pagos: true,
      };
    }

    // Crear un payload mock con ID fijo y datos de prueba
    const userNames: Record<string, string> = {
      'ADMIN': 'Administrador Sistema',
      'AUDITOR': 'Auditor Sistema',
      'COMPRADOR': 'Comprador Usuario',
      'GESTOR_PROVEEDORES': 'Gestor de Proveedores',
      'TESORERO': 'Tesorero Finanzas'
    };

    const tokenPayload = {
      id: ['ADMIN', 'AUDITOR', 'COMPRADOR', 'GESTOR_PROVEEDORES', 'TESORERO'].indexOf(rol) + 1,
      nombre: userNames[rol as keyof typeof userNames],
      email: `${rol.toLowerCase().replace('_', '.')}@compras.com`,
      rol: rol,
      permisos: permisos
    };

    const token = await signToken(tokenPayload);

    const response = NextResponse.json({ success: true, usuario: tokenPayload });
    
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (_error: any) {
    console.error('Error en mock login:', _error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
