import protobuf from 'protobufjs';

const protoSchema = `
syntax = "proto3";

message AuditoriaRequest {
  string token = 1;
  int32 id_funcion = 2;
  string accion = 3;
  string descripcion = 4;
  string observacion = 5;
  string ip_usuario = 6;
}

message AuditoriaResponse {
  bool success = 1;
  string message = 2;
}
`;

interface AuditoriaCentralParams {
  id_funcion: number;
  accion: string;
  descripcion: string;
  observacion: string;
  ip_usuario: string;
  usuario: string;
  clave?: string;
}

export async function registrarAuditoriaCentral({
  id_funcion,
  accion,
  descripcion,
  observacion,
  ip_usuario,
  usuario,
  clave
}: AuditoriaCentralParams) {
  try {
    // PASO 1: Autenticación del Módulo
    const apiKey = process.env.AUDITORIA_API_KEY || 'dev_key_tu_modulo_123';
    // Nota: El manual asume texto plano. Usaremos un placeholder o el password proporcionado durante el login
    const plainPassword = clave || 'dummy_password'; 
    
    const authRes = await fetch('https://712286fsib.execute-api.us-east-1.amazonaws.com/default/api-auth-central', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        usuario: usuario,
        clave: plainPassword,
        ip: ip_usuario
      })
    });

    if (!authRes.ok) {
      console.error('Error de autenticación central:', await authRes.text());
      return;
    }

    const authData = await authRes.json();
    if (!authData.success || !authData.token) {
      console.error('No se pudo obtener el token central:', authData);
      return;
    }

    const token = authData.token;

    // PASO 2: Envío de Pista de Auditoría (gRPC / Protobuf)
    // Usamos parse en línea para evitar problemas de rutas relativas de archivos .proto en producción AWS
    const root = protobuf.parse(protoSchema).root;
    const AuditoriaRequest = root.lookupType('AuditoriaRequest');

    const payload = {
      token,
      id_funcion,
      accion,
      descripcion,
      observacion,
      ip_usuario
    };

    const errMsg = AuditoriaRequest.verify(payload);
    if (errMsg) throw Error(errMsg);

    const message = AuditoriaRequest.create(payload);
    const buffer = AuditoriaRequest.encode(message).finish();

    const auditRes = await fetch('https://98l52rpey8.execute-api.us-east-1.amazonaws.com/default/api-pistas-auditoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-protobuf' },
      body: buffer
    });

    if (auditRes.ok) {
      console.log('Pista de auditoría centralizada con éxito.');
    } else {
      console.error('Error al enviar pista de auditoría central:', await auditRes.text());
    }

  } catch (error) {
    console.error('Excepción al registrar auditoría centralizada:', error);
  }
}
