export interface CuentaBancaria {
  id: string;
  banco: string;
  titular: string;
  tipoCuenta: string;
  numeroCuenta: string;
  saldo: number;
}

const CXC_BASE_URL = 'https://cuentasxcobrar-backend-300n.onrender.com';
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
      if (e.name === 'AbortError') return { success: false, error: 'Tiempo de espera agotado al conectar con CxC (Token)' };
      return { success: false, error: 'No se pudo contactar al servidor de CxC' };
    }

    if (!tokenRes.ok) {
      clearTimeout(timeoutId);
      return { success: false, error: 'No se pudo obtener el token de Cuentas por Cobrar' };
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.token;

    if (!token) {
      clearTimeout(timeoutId);
      return { success: false, error: 'Token inválido devuelto por Cuentas por Cobrar' };
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
      if (e.name === 'AbortError') return { success: false, error: 'Tiempo de espera agotado al conectar con CxC (Saldos)' };
      return { success: false, error: 'No se pudo contactar al servidor de CxC' };
    }

    clearTimeout(timeoutId);

    if (!saldosRes.ok) {
      return { success: false, error: 'No se pudieron obtener los saldos de Cuentas por Cobrar' };
    }

    const saldosData = await saldosRes.json();

    if (!Array.isArray(saldosData)) {
      return { success: false, error: 'Formato de respuesta inválido de Cuentas por Cobrar' };
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
    return { success: false, error: 'Hubo un problema de comunicación con el Módulo de Cuentas por Cobrar' };
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
