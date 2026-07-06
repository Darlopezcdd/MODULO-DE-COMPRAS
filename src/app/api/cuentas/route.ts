import { NextResponse } from 'next/server';
import { obtenerCuentasEmpresa } from '@/lib/cuentasClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await obtenerCuentasEmpresa();
    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: response.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
