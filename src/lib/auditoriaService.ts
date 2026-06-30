import prisma from './prisma';
import { enviarPistaAuditoriaCentral, FUNCIONES_AUDITORIA } from './auditoriaCentralClient';

function obtenerIdFuncion(accion: string, tablaAfectada: string): number {
  if (accion === 'LOGIN') return FUNCIONES_AUDITORIA.LOGIN;
  if (accion === 'LOGOUT') return FUNCIONES_AUDITORIA.LOGOUT;
  if (accion === 'CREAR') {
    if (tablaAfectada === 'facturas_compra') return FUNCIONES_AUDITORIA.CREAR_FACTURA;
    return FUNCIONES_AUDITORIA.CREAR_PROVEEDOR;
  }
  if (accion === 'ACTUALIZAR') {
    if (tablaAfectada === 'facturas_compra') return FUNCIONES_AUDITORIA.ANULAR_FACTURA;
    return FUNCIONES_AUDITORIA.ACTUALIZAR_PROVEEDOR;
  }
  if (accion === 'ELIMINAR') return FUNCIONES_AUDITORIA.ELIMINAR_PROVEEDOR;
  if (accion === 'IMPRIMIR') return FUNCIONES_AUDITORIA.IMPRIMIR_FACTURA;
  return 0;
}

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
        resultado: 'EXITO',
      }
    });

    const id_funcion = obtenerIdFuncion(accion, tablaAfectada);
    const observacion = `Tabla: ${tablaAfectada}, RegistroID: ${registroId || 'N/A'}`;
    enviarPistaAuditoriaCentral(
      id_funcion,
      accion,
      descripcion,
      observacion,
      '0.0.0.0',
    ).catch(err => console.error('Error enviando a auditoría central (no crítico):', err));

  } catch (err) {
    console.error('Error registrando auditoría local:', err);
  }
}
