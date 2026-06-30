import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // SEGURIDAD DESACTIVADA TEMPORALMENTE PARA PRUEBAS
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/facturas/:path*',
    '/proveedores/:path*',
    '/reportes/:path*',
    '/tesoreria/:path*',
    '/login'
  ]
};
