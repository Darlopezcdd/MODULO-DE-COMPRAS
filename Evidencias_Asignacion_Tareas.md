# Reporte de Evidencias de Asignación de Tareas

A continuación, se detalla la trazabilidad y la ubicación exacta en el código fuente de cada una de las responsabilidades asignadas a los miembros del equipo en el Módulo de Compras (Gestión de Proveedores).

---

## 👨‍💻 Dario López (Desarrollo)

### 1. Crear migración PostgreSQL: tabla proveedores
**Ubicación:** 
- Archivo SQL directo: [supabase/migrations/20260611_create_proveedores.sql](file:///c:/Users/lopez/OneDrive/Escritorio/aps/supabase/migrations/20260611_create_proveedores.sql)
- Esquema Prisma: [prisma/schema.prisma](file:///c:/Users/lopez/OneDrive/Escritorio/aps/prisma/schema.prisma) (Líneas 16-30)
**Evidencia:** El modelo `Proveedor` contiene todos los campos solicitados (`cedula_ruc`, `nombre`, `ciudad`, `tipo`, `direccion`, `telefono`, `email`, `estado`) y los tipos ENUM correspondientes.

### 2. Resolver GraphQL: mutation crearProveedor con validación de cédula/RUC
**Ubicación:** [src/graphql/resolvers.ts](file:///c:/Users/lopez/OneDrive/Escritorio/aps/src/graphql/resolvers.ts) (Líneas 40-57)
**Evidencia:** Se encuentra la función `crearProveedor` dentro del objeto `Mutation`, donde la primera instrucción es llamar a la validación de la cédula/RUC (`validateCedulaRuc(input.cedulaRuc);`) además de la comprobación de unicidad en la base de datos antes del `prisma.proveedor.create`.

### 3. Resolver GraphQL: agregar validaciones estrictas CA1 en mutaciones
**Ubicación:** [src/graphql/resolvers.ts](file:///c:/Users/lopez/OneDrive/Escritorio/aps/src/graphql/resolvers.ts) (Líneas 4-22)
**Evidencia:** Se crearon las funciones validadoras utilizando expresiones regulares estrictas:
- `validateCedulaRuc`: Regex para 10 o 13 dígitos numéricos.
- `validateNombre`: Regex para evitar números y caracteres especiales.
- `validateTelefono` y `validateEmail`: Formatos de teléfono y correos estandarizados.

---

## 👨‍💻 Jairo Farinango (Desarrollo)

### 1. Resolver GraphQL: mutation actualizarProveedor
**Ubicación:** [src/graphql/resolvers.ts](file:///c:/Users/lopez/OneDrive/Escritorio/aps/src/graphql/resolvers.ts) (Líneas 58-67)
**Evidencia:** Se implementó el resolver `actualizarProveedor`, el cual valida únicamente los campos que son enviados en el `input` y luego hace uso de `prisma.proveedor.update` para persistir los cambios.

### 2. Resolver GraphQL: mutation eliminarProveedor (soft delete, solo inactiva)
**Ubicación:** [src/graphql/resolvers.ts](file:///c:/Users/lopez/OneDrive/Escritorio/aps/src/graphql/resolvers.ts) (Líneas 68-76)
**Evidencia:** El resolver `eliminarProveedor` hace un `prisma.proveedor.update` en lugar de un `delete`. Específicamente, actualiza `estado: 'INACTIVO'` y registra la fecha en `deletedAt: new Date()`.

### 3. Resolver GraphQL: queries listarProveedores (filtros) y obtenerProveedor
**Ubicación:** [src/graphql/resolvers.ts](file:///c:/Users/lopez/OneDrive/Escritorio/aps/src/graphql/resolvers.ts) (Líneas 24-38)
**Evidencia:** 
- `listarProveedores`: Filtra por `deletedAt: null` y aplica filtros dinámicos si se envían los parámetros de `estado` o `tipo`.
- `obtenerProveedor`: Obtiene el registro individual buscando por `id` mediante `findUnique`.

---

## 🎨 Aldahir Requene (Diseño)

### 1. Página Next.js: listado de proveedores con filtros por estado y tipo
**Ubicación:** [src/app/proveedores/page.tsx](file:///c:/Users/lopez/OneDrive/Escritorio/aps/src/app/proveedores/page.tsx)
**Evidencia:** La página principal del módulo contiene el layout, la tabla HTML estilizada con *Tailwind CSS / Glassmorphism*, y dos `<select>` vinculados al estado local (`filtroEstado`, `filtroTipo`) que automáticamente envían las variables a la consulta GraphQL para filtrar la lista (Líneas 87-105).

### 2. Formulario alta/edición proveedor (validaciones tipo Crédito/Contado)
**Ubicación:** [src/components/ProveedorForm.tsx](file:///c:/Users/lopez/OneDrive/Escritorio/aps/src/components/ProveedorForm.tsx)
**Evidencia:** Se creó un componente reutilizable para Alta (en `/proveedores/nuevo`) y Edición (en `/proveedores/editar/[id]`). El formulario utiliza un campo de selección (select) estructurado exclusivamente con opciones `CONTADO` y `CREDITO`.

### 3. Frontend: Integrar validaciones estrictas visuales CA1 en formulario
**Ubicación:** [src/components/ProveedorForm.tsx](file:///c:/Users/lopez/OneDrive/Escritorio/aps/src/components/ProveedorForm.tsx) (Líneas 7-15)
**Evidencia:** Se implementó el esquema de validación visual con la librería `Zod` (`z.object({...})`) acoplada a `react-hook-form`. Este esquema incluye las expresiones regulares idénticas a las del backend para asegurar la prevención en tiempo real en la vista, bloqueando el envío del formulario y mostrando mensajes en rojo si el formato de teléfono o los nombres tienen caracteres inválidos.

---

## 🧪 Esau Hidalgo (Diseño / Pruebas)

### 1. Botón activar/desactivar proveedor + confirmación modal
**Ubicación:** [src/app/proveedores/page.tsx](file:///c:/Users/lopez/OneDrive/Escritorio/aps/src/app/proveedores/page.tsx)
**Evidencia:** 
- **Lógica Modal / Confirmación:** Implementado en la función asíncrona `desactivarProveedor` (Líneas 55-77) haciendo uso de una alerta nativa `confirm('¿Estás seguro...?')`.
- **Botón UI:** En el mapeo de la tabla (Línea 145), se renderiza condicionalmente el botón de desactivar únicamente si el proveedor actual tiene un `estado === 'ACTIVO'`.

### 2. Pruebas unitarias resolvers y pruebas del formulario
**Ubicación:** 
- Pruebas Frontend: [__tests__/ProveedorForm.test.tsx](file:///c:/Users/lopez/OneDrive/Escritorio/aps/__tests__/ProveedorForm.test.tsx)
- Pruebas Backend: [__tests__/resolvers.test.ts](file:///c:/Users/lopez/OneDrive/Escritorio/aps/__tests__/resolvers.test.ts)
**Evidencia:** Se configuró el entorno con `Jest`. 
- `resolvers.test.ts` (Líneas 18-72): Pruebas unitarias evaluando que las mutaciones lancen las excepciones correctas ante datos inválidos y validando que el *soft delete* funcione.
- `ProveedorForm.test.tsx` (Líneas 14-46): Pruebas de integración visuales que simulan interacciones del usuario comprobando los mensajes de error originados por *React Hook Form + Zod* e interceptando el API GraphQL (`fetch`).
