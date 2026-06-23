import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' },
    });

    const totalActivos = proveedores.filter(p => p.estado === 'ACTIVO').length;
    const totalInactivos = proveedores.length - totalActivos;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de Proveedores</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2563eb; margin: 0 0 10px 0; font-size: 28px; }
        .header p { color: #666; margin: 0; font-size: 14px; }
        
        .summary-box { display: flex; justify-content: space-around; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: bold; color: #0f172a; }
        .summary-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }

        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th { background-color: #f1f5f9; color: #334155; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569; }
        tr:nth-child(even) td { background-color: #f8fafc; }
        
        .badge { padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
        .badge-activo { background: #dcfce7; color: #166534; }
        .badge-inactivo { background: #fee2e2; color: #991b1b; }
        .badge-credito { background: #dbeafe; color: #1e40af; }
        .badge-contado { background: #fef3c7; color: #92400e; }
        
        .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Directorio de Proveedores</h1>
        <p>Generado el: ${new Date().toLocaleString('es-ES')}</p>
      </div>

      <div class="summary-box">
        <div class="summary-item">
          <div class="summary-value">${proveedores.length}</div>
          <div class="summary-label">Total Registrados</div>
        </div>
        <div class="summary-item">
          <div class="summary-value text-emerald-600">${totalActivos}</div>
          <div class="summary-label">Activos</div>
        </div>
        <div class="summary-item">
          <div class="summary-value text-rose-600">${totalInactivos}</div>
          <div class="summary-label">Inactivos</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Cédula/RUC</th>
            <th>Razón Social</th>
            <th>Ciudad</th>
            <th>Teléfono</th>
            <th>Tipo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${proveedores.map(p => `
            <tr>
              <td><strong>${p.cedulaRuc}</strong></td>
              <td>${p.nombre}</td>
              <td>${p.ciudad || '-'}</td>
              <td>${p.telefono || '-'}</td>
              <td><span class="badge ${p.tipo === 'CREDITO' ? 'badge-credito' : 'badge-contado'}">${p.tipo}</span></td>
              <td><span class="badge ${p.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'}">${p.estado}</span></td>
            </tr>
          `).join('')}
          ${proveedores.length === 0 ? '<tr><td colspan="6" style="text-align: center;">No hay proveedores registrados</td></tr>' : ''}
        </tbody>
      </table>

      <div class="footer">
        Sistema Inteligente de Compras - Documento Generado Automáticamente
      </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '30px', right: '30px', bottom: '30px', left: '30px' }
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Reporte_Proveedores.pdf"'
      }
    });

  } catch (error) {
    console.error('Error al generar PDF de proveedores:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
