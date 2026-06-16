# HU5 — Reporte de Proveedores (Generación PDF con Buffer)

Crear el script de generación de PDF para el reporte de proveedores usando **PDFKit** — la librería estándar de Node.js para generar PDFs como buffers en memoria, sin necesidad de un navegador headless.

El endpoint existente `GET /api/reportes/facturas` ya usa el patrón correcto. Se replicará para proveedores y se añadirá la generación PDF.

---

## Proposed Changes

### 1. Instalar dependencias PDF

```powershell
npm install pdfkit
npm install --save-dev @types/pdfkit
```

PDFKit genera el PDF directamente como un **stream/buffer en Node.js**, sin DOM ni browser. Es ideal para Next.js API Routes.

---

### 2. Script de generación PDF — `src/lib/proveedoresPdf.ts` [NEW]

#### [NEW] proveedoresPdf.ts

Función `generarReporteProveedoresPDF(proveedores[])` que recibe el array de proveedores y retorna un `Buffer`. Template con:

| Sección | Contenido |
|---|---|
| **Encabezado** | Logo/nombre empresa, título "Reporte de Proveedores", fecha de generación |
| **Resumen** | Total proveedores, activos, inactivos, por tipo (CONTADO/CRÉDITO) |
| **Tabla** | `#`, `Cédula/RUC`, `Nombre`, `Ciudad`, `Tipo`, `Teléfono`, `Email`, `Estado` |
| **Pie** | Generado por sistema · fecha · página N de M |

Diseño profesional: colores corporativos azul/gris, bordes en tabla, filas alternas.

---

### 3. API Endpoint — `src/app/api/reportes/proveedores/route.ts` [NEW]

#### [NEW] route.ts

Endpoint `GET /api/reportes/proveedores` que:

1. Acepta query params opcionales: `?estado=ACTIVO&tipo=CREDITO`
2. Consulta `prisma.proveedor.findMany()` con filtros
3. Llama a `generarReporteProveedoresPDF(proveedores)`
4. Retorna el buffer con headers:
   ```
   Content-Type: application/pdf
   Content-Disposition: attachment; filename="reporte-proveedores-YYYY-MM-DD.pdf"
   ```

---

## Verification Plan

### Manual
- Abrir `http://localhost:3003/api/reportes/proveedores` en el navegador → debe descargar el PDF
- Probar filtros: `/api/reportes/proveedores?estado=ACTIVO&tipo=CREDITO`
- Verificar que el PDF tiene el template completo (encabezado, tabla, totales)

### Automatizada
- El servidor `npm run dev` no debe mostrar errores de compilación

---

## Open Questions

> [!NOTE]
> **Sin librería de marca/logo**: El template usará texto en lugar de imagen de logo ya que no hay assets de empresa en el proyecto. ¿Tienes algún logo o nombre de empresa específico para el encabezado?

> [!NOTE]
> **`@types/pdfkit`**: PDFKit es una librería CommonJS. En Next.js 14 puede requerir configuración en `next.config.mjs` para el bundle del servidor. Lo manejaré automáticamente.
