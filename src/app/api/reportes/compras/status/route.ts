import { NextResponse } from 'next/server';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const bucketName = process.env.S3_REPORT_BUCKET || 'compras-facturas-erp-946445280288';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const msgId = searchParams.get('msgId');

    if (!msgId) {
      return NextResponse.json({ error: 'Falta msgId' }, { status: 400 });
    }

    const s3Key = `reportes/${msgId}.pdf`;

    try {
      // Verificar si el PDF existe en S3
      await s3Client.send(new HeadObjectCommand({
        Bucket: bucketName,
        Key: s3Key
      }));

      // Si no lanza error, el archivo existe
      return NextResponse.json({ 
        status: 'COMPLETED',
        downloadUrl: `/api/reportes/compras/download?msgId=${msgId}`
      });
    } catch (s3Error: any) {
      // Si el error es NotFound (404), significa que la Lambda aún no termina o el archivo no existe
      if (s3Error.name === 'NotFound' || s3Error.$metadata?.httpStatusCode === 404) {
        return NextResponse.json({ status: 'PENDING' });
      }
      throw s3Error; // Otro tipo de error (permisos, etc)
    }

  } catch (error) {
    console.error('Error al comprobar estado en S3:', error);
    return NextResponse.json({ error: 'Error interno al comprobar estado' }, { status: 500 });
  }
}
