# HU6 — Reporte de Facturas (Tareas: Aldahir Requene)

De acuerdo a la matriz de responsabilidades, en esta historia de usuario te tocan dos tareas específicas:

1. **Diseño (UI):** Diseño de componentes DatePicker y payload de validación de fechas.
2. **Desarrollo:** Desarrollo manual del componente de tabla renderizando estados vacíos y mapeo JSON.

---

## Proposed Changes

Voy a crear una página/vista completa para el Reporte de Facturas que integre ambas tareas.

### 1. Componente DatePicker y Filtros — `src/components/ReportesFiltros.tsx` [NEW]
Se diseñará un componente de filtros premium que incluirá:
- Dos selectores de fecha (`fechaInicio` y `fechaFin`) utilizando inputs tipo `date` nativos pero con estilos avanzados (glassmorphism/dark mode).
- Lógica de validación de payload: asegurar que `fechaFin` no sea menor a `fechaInicio` y que no se busquen fechas futuras inválidas.
- Botón de "Generar Reporte" que enviará el payload JSON validado.

### 2. Componente Tabla de Reportes — `src/components/ReportesTabla.tsx` [NEW]
Una tabla dinámica encargada de:
- Recibir un arreglo de facturas (mapeo JSON desde el endpoint que hará Dario López).
- Renderizar los datos: Número de factura, Fecha, Proveedor, Tipo de Pago y Totales.
- **Estados vacíos (Empty States):** Diseños ilustrativos para cuando no se han realizado búsquedas (estado inicial) y cuando la búsqueda no devuelve resultados.
- Estados de carga (Skeletons/Spinners) mientras se espera el endpoint.

### 3. Integración en la Página — `src/app/reportes/facturas/page.tsx` [NEW]
Para poder visualizar y probar tus componentes, crearé la página que agrupe `ReportesFiltros` y `ReportesTabla`. Dejaré la página preparada con un "Mock" temporal, simulando el endpoint `GET` que luego desarrollará Dario López.

---

## Verification Plan

1. **Prueba del DatePicker:**
   - Intentar seleccionar una fecha de fin menor a la fecha de inicio (deberá mostrar error visual).
   - Generar el payload correcto por consola al hacer clic en buscar.
2. **Prueba de Estados de la Tabla:**
   - Cargar la página y ver el estado inicial "Seleccione un rango de fechas".
   - Buscar un rango de fechas válido y ver la tabla con datos mapeados desde el JSON.
   - Buscar en un rango donde no hay datos y ver el estado vacío "No se encontraron facturas".

---

## Open Questions

> [!NOTE]
> Para el DatePicker, ¿prefieres usar los inputs nativos del navegador con estilos personalizados (más ligero y rápido), o prefieres que instale una librería externa como `react-datepicker`?
> (Recomiendo usar los inputs nativos `<input type="date">` bien estilizados para mantener el proyecto ligero).
