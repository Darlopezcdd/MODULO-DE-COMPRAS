import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({ region: 'us-east-1' });

export async function solicitarReporteAsincrono(parametrosReporte: any): Promise<string> {
  const queueUrl = process.env.SQS_URL || 'https://sqs.us-east-1.amazonaws.com/946445280288/compras-reportes-queue';
  
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(parametrosReporte),
  });

  try {
    const response = await sqsClient.send(command);
    return response.MessageId || 'Desconocido';
  } catch (error) {
    console.error("Error al enviar mensaje a SQS:", error);
    throw new Error("No se pudo encolar la generación del reporte");
  }
}
