import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de autenticación — BYPASS TEMPORAL
 * =============================================
 * La API de seguridad aún no está completa.
 * Cuando esté lista, descomentar la lógica original y eliminar el bypass.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function middleware(_request: NextRequest) {
  // TODO: Restaurar cuando la API de seguridad esté lista
  // ─────────────────────────────────────────────────────
  // const path = request.nextUrl.pathname;
  // const isPublicPath = path === '/login' || path.startsWith('/api/auth');
  // const token = request.cookies.get('auth-token')?.value || '';
  //
  // if (!isPublicPath && !token) {
  //   return NextResponse.redirect(new URL('/login', request.nextUrl));
  // }
  //
  // if (isPublicPath && token) {
  //   return NextResponse.redirect(new URL('/', request.nextUrl));
  // }

  // BYPASS: dejar pasar todas las peticiones sin autenticación
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
