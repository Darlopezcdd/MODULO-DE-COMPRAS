import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Factura ${data.numeroFactura || 'Borrador'}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; color: #555; }
        .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
        .invoice-box table td { padding: 5px; vertical-align: top; }
        .invoice-box table tr td:nth-child(2) { text-align: right; }
        .invoice-box table tr.top table td { padding-bottom: 20px; }
        .invoice-box table tr.top table td.title { font-size: 45px; line-height: 45px; color: #333; }
        .invoice-box table tr.information table td { padding-bottom: 40px; }
        .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
        .invoice-box table tr.details td { padding-bottom: 20px; }
        .invoice-box table tr.item td { border-bottom: 1px solid #eee; }
        .invoice-box table tr.item.last td { border-bottom: none; }
        .invoice-box table tr.total td:nth-child(2) { border-top: 2px solid #eee; font-weight: bold; }
        .text-right { text-align: right !important; }
        .header-company { font-size: 24px; font-weight: bold; color: #2563eb; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <table cellpadding="0" cellspacing="0">
          <tr class="top">
            <td colspan="4">
              <table>
                <tr>
                  <td class="title">
                    <span class="header-company">Mi Empresa S.A.</span>
                  </td>
                  <td class="text-right">
                    Factura #: ${data.numeroFactura || 'Borrador'}<br>
                    Emisión: ${data.fechaEmision || new Date().toLocaleDateString()}<br>
                    Vencimiento: ${data.fechaVencimiento || 'N/A'}<br>
                    Tipo Pago: ${data.tipoPago || 'CONTADO'}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr class="information">
            <td colspan="4">
              <table>
                <tr>
                  <td>
                    <strong>Proveedor:</strong><br>
                    ${data.proveedorNombre || 'Desconocido'}<br>
                    RUC: ${data.proveedorRuc || 'N/A'}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr class="heading">
            <td>Ítem</td>
            <td class="text-right">Precio Un.</td>
            <td class="text-right">Cant.</td>
            <td class="text-right">Subtotal</td>
          </tr>
          ${(data.items || []).map((item: any) => `
            <tr class="item">
              <td>${item.descripcion} ${item.aplicaIva ? '(IVA)' : ''}</td>
              <td class="text-right">$${Number(item.precioUnitario).toFixed(2)}</td>
              <td class="text-right">${item.cantidad}</td>
              <td class="text-right">$${(item.cantidad * item.precioUnitario).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="total">
            <td colspan="3" class="text-right">Subtotal sin IVA:</td>
            <td class="text-right">$${Number(data.subtotalSinIva || 0).toFixed(2)}</td>
          </tr>
          <tr class="total">
            <td colspan="3" class="text-right">Subtotal con IVA:</td>
            <td class="text-right">$${Number(data.subtotalConIva || 0).toFixed(2)}</td>
          </tr>
          <tr class="total">
            <td colspan="3" class="text-right">IVA (15%):</td>
            <td class="text-right">$${Number(data.montoIva || 0).toFixed(2)}</td>
          </tr>
          <tr class="total">
            <td colspan="3" class="text-right"><strong>Gran Total:</strong></td>
            <td class="text-right"><strong>$${Number(data.total || 0).toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="factura-preview.pdf"'
      }
    });

  } catch (error) {
    console.error('Error al generar PDF:', error);
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 });
  }
}
