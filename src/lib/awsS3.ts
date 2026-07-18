import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });

export async function uploadPdfToS3(buffer: Buffer, filename: string): Promise<string> {
  const bucketName = process.env.BUCKET_NAME || 'compras-facturas-erp-946445280288';
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: buffer,
    ContentType: 'application/pdf',
    // Opcional: ACL: 'public-read' si el bucket lo permite
  });

  try {
    await s3Client.send(command);
    return `https://${bucketName}.s3.amazonaws.com/${filename}`;
  } catch (error) {
    console.error("Error al subir archivo a S3:", error);
    throw new Error("No se pudo subir el archivo a S3");
  }
}
