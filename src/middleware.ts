import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/authUtils';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicPath = path === '/login' || path.startsWith('/api/auth');
  const token = request.cookies.get('auth-token')?.value || '';

  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  // Verificación dinámica de permisos por vista
  if (token && !isPublicPath) {
    const payload = await verifyToken(token) as any;
    
    if (!payload || !payload.permisos) {
      // Si el token es inválido o no tiene permisos, lo mandamos al login
      const response = NextResponse.redirect(new URL('/login', request.nextUrl));
      response.cookies.delete('auth-token');
      return response;
    }

    const { permisos } = payload;

    // Verificar acceso a Proveedores
    if (path.startsWith('/proveedores') && !permisos.ver_proveedores) {
      return NextResponse.redirect(new URL('/', request.nextUrl));
    }

    // Verificar acceso a Facturas
    if (path.startsWith('/facturas') && !permisos.ver_facturas) {
      return NextResponse.redirect(new URL('/', request.nextUrl));
    }

    // Verificar acceso a Reportes
    if (path.startsWith('/reportes') && !permisos.ver_reportes) {
      return NextResponse.redirect(new URL('/', request.nextUrl));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/facturas/:path*',
    '/proveedores/:path*',
    '/reportes/:path*',
    '/login'
  ]
};
