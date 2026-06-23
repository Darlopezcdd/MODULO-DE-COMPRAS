import { NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/authUtils';

export async function GET(request: Request) {
  try {
    const usuario = await getUserFromRequest(request);

    if (!usuario) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    return NextResponse.json({ usuario });
  } catch (_error) {
    return NextResponse.json({ error: 'Error al obtener sesión' }, { status: 500 });
  }
}
