# HU5: Pruebas Manuales de Regeneración de PDF

Este documento detalla los escenarios de prueba manual para verificar el comportamiento del sistema ante reintentos fallidos de impresión de facturas (Regeneración de PDF).

## Pre-requisitos
- Tener el entorno local ejecutándose (`npm run dev`).
- Tener al menos una factura en estado `EMITIDA` con `pdf_generado = false`.
- Herramientas recomendadas: DevTools del navegador (Network Tab) para simular fallos de red.

## Caso de Prueba 1: Fallo de red durante la generación inicial del PDF
**Objetivo:** Verificar que si la primera generación falla, la factura no se marca erróneamente como `pdf_generado = true`.

1. Navegar al listado de facturas.
2. Hacer clic en el botón "Imprimir/Generar PDF" de una factura nueva.
3. En la pestaña Network (DevTools), activar el modo *Offline* inmediatamente después de hacer clic, o bloquear la ruta de generación del PDF.
4. **Resultado Esperado:** 
   - El sistema debe mostrar un mensaje de error ("Error de red al generar el PDF").
   - La base de datos debe mantener `pdf_generado = false`.
   - La factura debe seguir siendo editable.

## Caso de Prueba 2: Reintento exitoso de impresión (Regeneración)
**Objetivo:** Verificar que un segundo intento de impresión, tras un fallo previo, genere el documento correctamente y bloquee la factura.

1. Usando la misma factura del Caso 1, asegurar que la conexión de red es estable.
2. Hacer clic en "Imprimir/Generar PDF" nuevamente.
3. **Resultado Esperado:**
   - El PDF debe generarse y abrirse o descargarse.
   - La base de datos debe actualizarse a `pdf_generado = true`.
   - La factura debe pasar a modo "Sólo Lectura" (Inmutable) en la interfaz.

## Caso de Prueba 3: Intento de regeneración bloqueada por inmutabilidad
**Objetivo:** Validar que si se intenta regenerar o alterar una factura que ya fue impresa, el sistema (y el trigger en DB) lo impidan.

1. Seleccionar una factura que tenga `pdf_generado = true`.
2. Intentar modificar manualmente algún valor (cantidad, subtotal) mediante un endpoint cURL o Postman enviando un PATCH/PUT al backend.
3. **Resultado Esperado:**
   - La base de datos debe rechazar el `UPDATE` gracias al trigger `trg_check_factura_inmutabilidad`.
   - El servidor debe responder con un error HTTP 500 o 400 detallando "No se puede modificar una factura cuyo PDF ya ha sido generado y entregado."
