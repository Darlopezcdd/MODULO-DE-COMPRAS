import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET() {
  try {
    const proveedores = await prisma.proveedor.findMany({ take: 1 });
    return NextResponse.json({ success: true, proveedores });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      errorName: error.name, 
      errorMessage: error.message,
      errorCode: error.code 
    }, { status: 500 });
  }
}
