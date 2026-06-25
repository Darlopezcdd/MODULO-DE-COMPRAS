# Manual de Integración — Módulo de Compras (API REST)

Este documento es una guía para desarrolladores de otros módulos (Seguridad, Inventario, Tesorería) sobre cómo consumir la API expuesta por el **Módulo de Compras**.

Esta API usa **cookies HTTP-Only** para manejar la sesión. La documentación técnica detallada (esquemas de datos) se encuentra disponible visualmente si se monta Swagger en `/api-docs`.

---

## 1. URL Base
- **Desarrollo Local:** `http://localhost:3000`
- **Producción:** `https://modulo-compras.vercel.app` (o el dominio final configurado)

---

## 2. Autenticación y Autorización
Todo consumo a la API (excepto el propio endpoint de login) requiere estar autenticado.

### `POST /api/auth/login`
Debes enviar las credenciales para recibir una cookie llamada `auth-token`.

**Nota de Desarrollo:** Actualmente el endpoint está en modo "mock" y solo requiere el envío de un `rol`. En producción, requerirá las credenciales reales (`email` y `password`).

**Petición (Ejemplo MOCK actual):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"rol": "ADMIN"}'
```

**Respuesta Exitosa (200 OK):**
El servidor responderá con el JWT establecido automáticamente en las Cookies del navegador (o cliente) bajo el nombre `auth-token`.

---

## 3. Endpoints Públicos para Módulos Externos

### 3.1. Obtener Directorio de Proveedores (Para Módulo de Inventario / Tesorería)
Devuelve la lista de proveedores registrados, junto con sus saldos pendientes agrupados.

- **URL:** `GET /api/reportes/proveedores/json`
- **Autenticación:** Requerida (Cookie `auth-token`)
- **Query Params (Opcionales):**
  - `estado`: `ACTIVO` o `INACTIVO`
  - `tipo`: `CONTADO` o `CREDITO`

**Ejemplo de uso (JavaScript / Fetch):**
```javascript
const res = await fetch('http://localhost:3000/api/reportes/proveedores/json?estado=ACTIVO', {
  credentials: 'omit' // O 'include' si compartes dominio y quieres enviar la cookie
});
const data = await res.json();
console.log(data);
/*
{
  "success": true,
  "total": 15,
  "activos": 10,
  "inactivos": 5,
  "data": [
    {
      "id": 1,
      "cedulaRuc": "1712345678001",
      "nombre": "Distribuidora Nacional",
      "saldoPendiente": 1500.50
    }
  ]
}
*/
```

---

### 3.2. Obtener Historial de Facturas (Para Módulo de Tesorería)
Permite consultar las facturas de compra generadas, incluyendo el desglose de sus productos. Útil para gestionar cuentas por pagar.

- **URL:** `GET /api/reportes/facturas`
- **Autenticación:** Requerida (Cookie `auth-token`)
- **Query Params (Opcionales):**
  - `estado`: `BORRADOR`, `EMITIDA`, `ANULADA`
  - `fechaInicio`: Formato `YYYY-MM-DD`
  - `fechaFin`: Formato `YYYY-MM-DD`

**Ejemplo de Petición cURL:**
```bash
curl "http://localhost:3000/api/reportes/facturas?estado=EMITIDA" \
  -b "auth-token=TU_TOKEN_AQUI"
```

---

### 3.3. Consultar Pistas de Auditoría (Para Módulo de Seguridad)
Retorna el historial completo de acciones de los usuarios dentro del Módulo de Compras. 
> **Requisito de Rol:** El usuario consultando debe ser `ADMIN` o `AUDITOR`.

- **URL:** `GET /api/auditoria`
- **Autenticación:** Requerida (Cookie `auth-token`)
- **Query Params (Paginación y Filtros):**
  - `pagina` (int) - Default: 1
  - `limite` (int) - Default: 20
  - `accion` (string) - Ej. `LOGIN`, `CREAR`, `IMPRIMIR`
  - `usuarioId` (int) - Para auditar a un empleado específico.

**Ejemplo de Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "fechaHora": "2026-06-24T20:00:00.000Z",
      "usuarioId": 1,
      "usuarioNombre": "Admin",
      "accion": "CREAR",
      "modulo": "COMPRAS",
      "tablaAfectada": "proveedor",
      "registroId": "42",
      "resultado": "EXITO"
    }
  ],
  "total": 120,
  "pagina": 1,
  "totalPaginas": 6
}
```

---

### 3.4. Endpoint GraphQL General
Para consultas avanzadas (como mutaciones complejas o relaciones anidadas profundas), el módulo expone un endpoint unificado de GraphQL.

- **URL:** `POST /api/graphql`
- **Autenticación:** Requerida (Cookie `auth-token`)

Deberás enviar un JSON con la estructura `{ "query": "..." }` y, opcionalmente, `variables`. La definición de los esquemas se encuentra documentada internamente en la ruta `src/graphql/schema.ts` y en la UI de Apollo si se habilita el playground en desarrollo.
