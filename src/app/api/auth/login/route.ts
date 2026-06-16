import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import * as bcrypt from 'bcryptjs';
import { signToken } from '../../../../lib/authUtils';
import { registrarAuditoria } from '../../../../lib/auditoriaService';

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
