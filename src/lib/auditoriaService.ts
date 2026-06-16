import prisma from './prisma';

export async function registrarAuditoria(
  usuarioId: number,
  usuarioNombre: string,
  accion: 'LOGIN' | 'LOGOUT' | 'CREAR' | 'ACTUALIZAR' | 'ELIMINAR' | 'IMPRIMIR',
  tablaAfectada: string,
  registroId: number | null,
  datosAnteriores: any | null,
  datosNuevos: any | null,
  descripcion: string
) {
  try {
    await prisma.pista_auditoria.create({
      data: {
        usuario_id: usuarioId,
        usuario_nombre: usuarioNombre,
        accion: accion,
        modulo: 'COMPRAS',
        tabla_afectada: tablaAfectada,
        registro_id: registroId ? BigInt(registroId) : null,
        datos_anteriores: datosAnteriores || undefined,
        datos_nuevos: datosNuevos || undefined,
        descripcion: descripcion,
      }
    });
  } catch (err) {
    console.error('Error registrando auditoría:', err);
  }
}
