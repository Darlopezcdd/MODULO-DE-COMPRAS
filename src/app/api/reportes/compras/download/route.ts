import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const msgId = searchParams.get('msgId');

    if (!msgId) {
      return NextResponse.json({ error: 'Falta msgId' }, { status: 400 });
    }

    const efsMountPath = process.env.EFS_MOUNT_PATH || '/mnt/efs/reports';
    const filePath = path.join(efsMountPath, `${msgId}.pdf`);

    // Validamos que el archivo realmente exista en EFS
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'El reporte no se encuentra en el sistema de archivos' }, { status: 404 });
    }

    // Leemos el PDF desde EFS
    const fileBuffer = fs.readFileSync(filePath);
    
    // Retornamos el buffer como un archivo descargable PDF
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Reporte_Facturas_${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error al leer el reporte desde EFS:', error);
    return NextResponse.json({ error: 'Error interno al leer el archivo PDF' }, { status: 500 });
  }
}
