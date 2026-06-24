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

    if (!rol || (rol !== 'ADMIN' && rol !== 'COMPRADOR')) {
      return NextResponse.json({ error: 'Rol inválido o no proporcionado' }, { status: 400 });
    }

    // Definir permisos dinámicos basados en el rol (Simulando lo que haría el Módulo de Seguridad)
    let permisos = {
      ver_proveedores: false,
      ver_facturas: false,
      ver_reportes: false,
      puede_anular: false,
    };

    if (rol === 'ADMIN') {
      permisos = {
        ver_proveedores: true,
        ver_facturas: true,
        ver_reportes: true,
        puede_anular: true,
      };
    } else if (rol === 'COMPRADOR') {
      permisos = {
        ver_proveedores: true,
        ver_facturas: true,
        ver_reportes: false,
        puede_anular: false,
      };
    }

    // Crear un payload mock con ID fijo y datos de prueba
    const tokenPayload = {
      id: rol === 'ADMIN' ? 1 : 2,
      nombre: rol === 'ADMIN' ? 'Administrador Sistema' : 'Comprador Usuario',
      email: rol === 'ADMIN' ? 'admin@compras.com' : 'comprador@compras.com',
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
