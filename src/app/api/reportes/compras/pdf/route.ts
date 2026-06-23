import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo') || 'todas';
    const fechaParam = searchParams.get('fecha');

    let whereClause: any = {};
    let periodoStr = 'Histórico completo';

    if (tipo !== 'todas' && fechaParam) {
      const [y, m, d] = fechaParam.split('-').map(Number);
      
      if (tipo === 'dia') {
        const start = new Date(y, m - 1, d, 0, 0, 0);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        whereClause = { fecha: { gte: start, lte: end } };
        periodoStr = `Día: ${start.toLocaleDateString('es-ES')}`;
      } else if (tipo === 'mes') {
        const start = new Date(y, m - 1, 1, 0, 0, 0);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        whereClause = { fecha: { gte: start, lte: end } };
        periodoStr = `Mes: ${start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
      } else if (tipo === 'anio') {
        const start = new Date(y, 0, 1, 0, 0, 0);
        const end = new Date(y, 11, 31, 23, 59, 59, 999);
        whereClause = { fecha: { gte: start, lte: end } };
        periodoStr = `Año: ${start.getFullYear()}`;
      }
    }

    const facturas = await prisma.facturas_compra.findMany({
      where: whereClause,
      orderBy: { fecha: 'desc' },
    });

    const proveedorIds = facturas.map(f => f.proveedor_id);
    const proveedores = await prisma.proveedor.findMany({
      where: { id: { in: proveedorIds } },
      select: { id: true, nombre: true, cedulaRuc: true }
    });

    const facturasConProveedor = facturas.map(f => {
      const prov = proveedores.find(p => p.id === f.proveedor_id);
      return {
        ...f,
        proveedor: prov
      };
    });

    const totalGastado = facturas.reduce((sum, f) => sum + Number(f.total), 0);
    const totalEmitidas = facturas.filter(f => f.estado === 'EMITIDA').length;
    const totalBorrador = facturas.filter(f => f.estado === 'BORRADOR').length;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de Compras</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #059669; margin: 0 0 10px 0; font-size: 28px; }
        .header p { color: #666; margin: 0; font-size: 14px; }
        .periodo { font-weight: bold; color: #333; margin-top: 5px; }
        
        .summary-box { display: flex; justify-content: space-around; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: bold; color: #0f172a; }
        .summary-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }

        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
        th { background-color: #f1f5f9; color: #334155; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569; }
        tr:nth-child(even) td { background-color: #f8fafc; }
        .text-right { text-align: right; }
        
        .badge { padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; }
        .badge-emitida { background: #dcfce7; color: #166534; }
        .badge-borrador { background: #fef08a; color: #854d0e; }
        .badge-anulada { background: #fee2e2; color: #991b1b; }
        
        .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Reporte de Compras</h1>
        <p>Generado el: ${new Date().toLocaleString('es-ES')}</p>
        <p class="periodo">Filtro: ${periodoStr}</p>
      </div>

      <div class="summary-box">
        <div class="summary-item">
          <div class="summary-value">${facturas.length}</div>
          <div class="summary-label">Total Facturas</div>
        </div>
        <div class="summary-item">
          <div class="summary-value text-emerald-600">$${totalGastado.toFixed(2)}</div>
          <div class="summary-label">Inversión Total</div>
        </div>
        <div class="summary-item">
          <div class="summary-value text-emerald-600">${totalEmitidas}</div>
          <div class="summary-label">Fact. Emitidas</div>
        </div>
        <div class="summary-item">
          <div class="summary-value text-amber-600">${totalBorrador}</div>
          <div class="summary-label">Fact. Borrador</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Número Factura</th>
            <th>Proveedor</th>
            <th>RUC</th>
            <th>Estado</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${facturasConProveedor.map(f => {
            let badgeClass = 'badge-anulada';
            if (f.estado === 'EMITIDA') badgeClass = 'badge-emitida';
            if (f.estado === 'BORRADOR') badgeClass = 'badge-borrador';
            
            return `
            <tr>
              <td>${new Date(f.fecha).toLocaleDateString('es-ES')}</td>
              <td><strong>${f.numero_factura}</strong></td>
              <td>${f.proveedor?.nombre || 'Desconocido'}</td>
              <td>${f.proveedor?.cedulaRuc || '-'}</td>
              <td><span class="badge ${badgeClass}">${f.estado}</span></td>
              <td class="text-right"><strong>$${Number(f.total).toFixed(2)}</strong></td>
            </tr>
          `}).join('')}
          ${facturas.length === 0 ? '<tr><td colspan="6" style="text-align: center;">No hay facturas en el período seleccionado</td></tr>' : ''}
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
        'Content-Disposition': 'attachment; filename="Reporte_Compras.pdf"'
      }
    });

  } catch (error) {
    console.error('Error al generar PDF de compras:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
