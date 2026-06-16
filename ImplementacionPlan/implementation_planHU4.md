# HU4 — Impresión de factura PDF (Tarea: Aldahir Requene)

**Aclaración sobre la matriz de tareas:** En tu mensaje copiaste el texto de las tareas de la HU3, pero según la imagen de la matriz que enviaste, la tarea real que le toca a **Aldahir Requene** en la **HU4** es:
> **"Desarrollo de script de generación PDF configurando la librería de buffers (Template base con IA)."**

Como el alcance indica explícitamente **solo** hacer lo que le toca a Aldahir, me enfocaré **únicamente** en la creación del script base de generación del PDF de la factura.

---

## Proposed Changes

### 1. Script de generación PDF de Factura — `src/lib/facturaPdf.ts` [NEW]

Voy a crear una función pura `generarFacturaPDF(datosFactura)` que utilizará **PDFKit** (librería de buffers que ya configuramos previamente) para dibujar una factura con diseño profesional.

El template base de la factura incluirá:
- **Encabezado:** Título "FACTURA DE COMPRA", Número de Factura, Fecha de Emisión.
- **Datos del Proveedor:** Nombre/Razón Social, Cédula/RUC, Dirección, Teléfono, Tipo de Pago (Contado/Crédito).
- **Tabla de Detalle de Productos:** Columnas (Cant., Descripción, V. Unitario, IVA, V. Total).
- **Cuadro de Totales:** Subtotal sin IVA, Subtotal con IVA, IVA (15%), Total a Pagar.
- **Pie de página:** Texto de inmutabilidad o firma.

Al ser un script basado en buffers, devolverá un `Promise<Buffer>` listo para que **Esau Hidalgo** (quien hace el flujo de previsualización) y el resto del equipo lo consuman y lo conecten con el frontend y la base de datos.

---

## Verification Plan

Como esta tarea es puramente el desarrollo del script (la lógica de generación), la verificación consistirá en:
1. Comprobar que el archivo compila correctamente sin errores de TypeScript.
2. (Opcional) Crear un pequeño endpoint de prueba rápida (`/api/test-pdf-factura`) solo para que podamos visualizar y validar el diseño del PDF generado con un JSON falso, asegurando que el template es correcto.

---

## Open Questions

> [!NOTE]
> ¿Estás de acuerdo con crear un endpoint temporal de prueba (`/api/test-pdf-factura`) para que podamos ver y descargar el PDF de prueba? Esto nos ayudará a confirmar que el diseño cumple las expectativas antes de que el resto del equipo lo integre.
