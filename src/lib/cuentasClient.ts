export interface CuentaBancaria {
  id: string;
  banco: string;
  titular: string;
  tipoCuenta: string;
  numeroCuenta: string;
  saldo: number;
}

const CXC_BASE_URL = process.env.CXC_BASE_URL || 'http://alb-backend-cuentas-1206540742.us-east-1.elb.amazonaws.com';
const FETCH_TIMEOUT_MS = 15000;

export async function obtenerCuentasEmpresa(): Promise<{ success: boolean; data?: CuentaBancaria[]; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // 1. Obtener Token
    let tokenRes;
    try {
      tokenRes = await fetch(`${CXC_BASE_URL}/api/cxc/token`, {
        method: 'POST',
        headers: {
          'Accept': '*/*'
        },
        signal: controller.signal
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.error("Fallo al contactar CxC (Token):", e);
      return { success: false, error: 'Error de red al conectar con el servidor de Cuentas por Cobrar' };
    }

    if (!tokenRes.ok) {
      clearTimeout(timeoutId);
      console.error("Error del servidor CxC (Token)");
      return { success: false, error: 'Error de autenticación con el servidor de Cuentas por Cobrar' };
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.token;

    if (!token) {
      clearTimeout(timeoutId);
      return { success: false, error: 'No se recibió un token válido del servidor' };
    }

    // 2. Obtener saldos
    let saldosRes;
    try {
      saldosRes = await fetch(`${CXC_BASE_URL}/api/cxc/cuentas-saldos`, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.error("Fallo al contactar CxC (Saldos):", e);
      return { success: false, error: 'Error de red al solicitar los saldos' };
    }

    clearTimeout(timeoutId);

    if (!saldosRes.ok) {
      console.error("Error del servidor CxC al pedir saldos");
      return { success: false, error: `Error del servidor al obtener saldos (Status: ${saldosRes.status})` };
    }

    const saldosData = await saldosRes.json();

    if (!Array.isArray(saldosData)) {
      console.error("Respuesta inesperada de CxC:", saldosData);
      return { success: false, error: 'Formato de respuesta inválido desde el servidor' };
    }

    // 3. Mapear a la interfaz esperada por nuestro sistema
    const cuentasMapeadas: CuentaBancaria[] = saldosData.map((cuenta: any) => ({
      id: cuenta.cuentaId,
      banco: cuenta.nombre,
      saldo: cuenta.saldo_disponible,
      titular: "Empresa S.A.", // Dato por defecto
      tipoCuenta: "No especificado", // Dato por defecto
      numeroCuenta: cuenta.cuentaId.split('-')[0] || cuenta.cuentaId // Usar segmento inicial del UUID para mostrar algo
    }));

    return { success: true, data: cuentasMapeadas };
  } catch (error: any) {
    console.error('Error al comunicarse con Cuentas por Cobrar:', error);
    return { success: false, error: 'Error interno al procesar las cuentas bancarias' };
  }
}

// Mantenemos la lógica de débito simulada internamente ya que no hay endpoint de débito reportado en CxC.
export async function registrarDebito(cuentaId: string, monto: number, motivo: string): Promise<{ success: boolean; nuevoSaldo?: number; error?: string }> {
  // Simulamos delay de red
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Como no hay endpoint de Cuentas por Cobrar para debito en este momento, se simula éxito
  console.log(`[API CXC SIMULADA] Débito registrado exitosamente. Cuenta: ${cuentaId}, Monto: -$${monto}, Motivo: ${motivo}`);
  
  return { success: true, nuevoSaldo: 0 };
}
