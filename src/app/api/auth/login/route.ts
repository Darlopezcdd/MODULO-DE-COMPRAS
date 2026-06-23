import { NextResponse } from 'next/server';
import { signToken } from '../../../../lib/authUtils';

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
