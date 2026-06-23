import { NextResponse } from 'next/server';
import { registrarAuditoria } from '../../../../lib/auditoriaService';
import { getUserFromRequest } from '../../../../lib/authUtils';

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Cierra la sesión del usuario actual eliminando la cookie `auth-token`. Registra la acción en auditoría.
 *     tags:
 *       - Auth
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Error al cerrar sesión
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
