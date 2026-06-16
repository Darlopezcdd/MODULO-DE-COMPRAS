import { NextResponse } from 'next/server';
import { registrarAuditoria } from '../../../../lib/auditoriaService';
import { getUserFromRequest } from '../../../../lib/authUtils';

export async function POST(request: Request) {
  try {
    const usuario = await getUserFromRequest(request);
    
    if (usuario) {
      await registrarAuditoria(
        usuario.id as number,
        usuario.nombre as string,
        'LOGOUT',
        'usuarios',
        usuario.id as number,
        null,
        null,
        'Cierre de sesión'
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth-token');
    return response;
  } catch {
    return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 });
  }
}
