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

    // Ruta donde está montado el EFS en la instancia EC2
    // Se asume /mnt/efs/reports por defecto
    const efsMountPath = process.env.EFS_MOUNT_PATH || '/mnt/efs/reports';
    const filePath = path.join(efsMountPath, `${msgId}.pdf`);

    // Comprobar directamente en el sistema de archivos (EFS) si el archivo ya fue generado por la Lambda
    if (fs.existsSync(filePath)) {
      return NextResponse.json({ 
        status: 'COMPLETED',
        // Proporcionamos la URL de descarga que leerá el archivo desde EFS
        downloadUrl: `/api/reportes/compras/download?msgId=${msgId}`
      });
    } else {
      return NextResponse.json({ status: 'PENDING' });
    }
  } catch (error) {
    console.error('Error al comprobar estado en EFS:', error);
    return NextResponse.json({ error: 'Error interno al comprobar estado' }, { status: 500 });
  }
}
