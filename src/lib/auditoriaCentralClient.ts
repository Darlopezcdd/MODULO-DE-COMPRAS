import protobuf from 'protobufjs';
import path from 'path';

const AUTH_URL = 'https://712286fslb.execute-api.us-east-1.amazonaws.com/default/api-auth-central';
const AUDIT_URL = 'https://98l52rpey8.execute-api.us-east-1.amazonaws.com/default/api-pistas-auditoria';
const API_KEY = 'dev_key_compras_444';

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export async function authenticateModule(): Promise<string> {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: API_KEY,
      usuario: 'modulo_compras',
      clave: 'compras_service',
      ip: '0.0.0.0',
    }),
  });

  if (!response.ok) {
    throw new Error(`Error de autenticación con el módulo central de seguridad: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.token) {
    throw new Error('Autenticación fallida con el módulo central de seguridad: ' + (data.message || 'sin token'));
  }

  cachedToken = data.token;
  tokenExpiry = Date.now() + 7 * 60 * 60 * 1000;

  return data.token;
}

export async function enviarPistaAuditoriaCentral(
  id_funcion: number,
  accion: string,
  descripcion: string,
  observacion: string,
  ip_usuario: string,
): Promise<boolean> {
  try {
    const token = await authenticateModule();

    const protoPath = path.join(process.cwd(), 'src', 'lib', 'auditoria.proto');
    const root = await protobuf.load(protoPath);
    const AuditoriaRequest = root.lookupType('AuditoriaRequest');
    const AuditoriaResponse = root.lookupType('AuditoriaResponse');

    const message = AuditoriaRequest.create({
      token,
      id_funcion,
      accion,
      descripcion,
      observacion,
      ip_usuario,
    });

    const uint8arr = AuditoriaRequest.encode(message).finish();

    const response = await fetch(AUDIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-protobuf' },
      body: Buffer.from(uint8arr),
    });

    if (response.status === 401) {
      cachedToken = null;
      tokenExpiry = null;
      throw new Error('Token expirado — reintentar autenticación');
    }

    if (!response.ok) {
      console.error(`Error del servidor central de auditoría: ${response.status}`);
      return false;
    }

    const responseBuffer = await response.arrayBuffer();
    const decoded = AuditoriaResponse.decode(new Uint8Array(responseBuffer)) as any;

    return decoded.success === true;
  } catch (err) {
    console.error('Error al enviar pista de auditoría central:', err);
    return false;
  }
}

export const FUNCIONES_AUDITORIA: Record<string, number> = {
  CREAR_PROVEEDOR: 101,
  ACTUALIZAR_PROVEEDOR: 102,
  ELIMINAR_PROVEEDOR: 103,
  CREAR_FACTURA: 201,
  ANULAR_FACTURA: 202,
  IMPRIMIR_FACTURA: 203,
  PAGO_CREDITO: 301,
  LOGIN: 401,
  LOGOUT: 402,
};
