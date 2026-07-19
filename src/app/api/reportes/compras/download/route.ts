import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const bucketName = process.env.S3_REPORT_BUCKET || 'compras-facturas-erp-946445280288';

// Helper para convertir el stream de S3 en un Buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const msgId = searchParams.get('msgId');

    if (!msgId) {
      return NextResponse.json({ error: 'Falta msgId' }, { status: 400 });
    }

    const s3Key = `reportes/${msgId}.pdf`;

    try {
      const { Body } = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key
      }));

      if (!Body) {
        throw new Error('Body is undefined');
      }

      const fileBuffer = await streamToBuffer(Body as Readable);

      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Reporte_Facturas_${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    } catch (s3Error: any) {
      if (s3Error.name === 'NoSuchKey' || s3Error.$metadata?.httpStatusCode === 404) {
        return NextResponse.json({ error: 'El reporte no se encuentra en S3' }, { status: 404 });
      }
      throw s3Error;
    }

  } catch (error) {
    console.error('Error al descargar el reporte desde S3:', error);
    return NextResponse.json({ error: 'Error interno al leer el archivo PDF' }, { status: 500 });
  }
}
