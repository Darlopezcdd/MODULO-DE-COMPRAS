export interface CuentaBancaria {
  id: string;
  banco: string;
  titular: string;
  tipoCuenta: string;
  numeroCuenta: string;
  saldo: number;
}

// Datos Mockeados de Cuentas (Simulando API Externa CXC)
let cuentasEmpresa: CuentaBancaria[] = [
  {
    id: "cta_001",
    banco: "Banco Pichincha",
    titular: "Empresa S.A.",
    tipoCuenta: "Corriente",
    numeroCuenta: "2100054321",
    saldo: 50000.00
  },
  {
    id: "cta_002",
    banco: "Banco Guayaquil",
    titular: "Empresa S.A.",
    tipoCuenta: "Ahorros",
    numeroCuenta: "0987654321",
    saldo: 15000.00
  }
];

export async function obtenerCuentasEmpresa(): Promise<{ success: boolean; data?: CuentaBancaria[]; error?: string }> {
  // Simulamos delay de red
  await new Promise(resolve => setTimeout(resolve, 300));
  return { success: true, data: cuentasEmpresa };
}

export async function registrarDebito(cuentaId: string, monto: number, motivo: string): Promise<{ success: boolean; nuevoSaldo?: number; error?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const cuenta = cuentasEmpresa.find(c => c.id === cuentaId);
  if (!cuenta) {
    return { success: false, error: "Cuenta bancaria no encontrada." };
  }

  if (cuenta.saldo < monto) {
    return { success: false, error: `Fondos insuficientes en la cuenta ${cuenta.numeroCuenta}.` };
  }

  // Descontar saldo
  cuenta.saldo -= monto;
  console.log(`[API CXC] Débito registrado exitosamente. Cuenta: ${cuentaId}, Monto: -$${monto}, Motivo: ${motivo}`);
  
  return { success: true, nuevoSaldo: cuenta.saldo };
}
