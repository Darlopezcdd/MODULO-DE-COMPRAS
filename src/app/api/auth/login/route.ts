import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import * as bcrypt from 'bcryptjs';
import { signToken } from '../../../../lib/authUtils';
import { registrarAuditoria } from '../../../../lib/auditoriaService';

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
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Credenciales incompletas' }, { status: 400 });
    }

    const usuario = await prisma.usuarios.findUnique({ where: { email } });

    if (!usuario || usuario.estado !== 'ACTIVO') {
      return NextResponse.json({ error: 'Usuario no encontrado o inactivo' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, usuario.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    const tokenPayload = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    };

    const token = await signToken(tokenPayload);

    await registrarAuditoria(
      usuario.id as number,
      usuario.nombre as string,
      'LOGIN',
      'usuarios',
      usuario.id as number,
      null,
      null,
      'Inicio de sesión exitoso'
    );

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
    console.error('Error en login:', _error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
