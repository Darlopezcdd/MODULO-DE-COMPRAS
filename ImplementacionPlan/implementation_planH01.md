# Plan de Implementación — HU1: Administración de Proveedores

A continuación se detalla el plan de trabajo ejecutado exclusivamente para las tareas asignadas a **Aldahir Requene** (Rol: Diseño) en la Historia de Usuario 1.

## 1. Levantamiento de Flujos y Diseño UI/UX
**Objetivo:** Definir la experiencia de usuario y la interfaz gráfica antes de la codificación.

- **Levantamiento de Flujos de Proceso:**
  - Creación del diagrama de flujo de interacción del usuario, abarcando desde la vista principal (Listado) hasta la acción de crear o editar un proveedor (Formulario).
  - Definición del flujo de éxito (proveedor guardado) y flujos alternos (errores de validación visual).
- **Diseño de Mockups (Figma/Wireframes):**
  - Diseño de la **Pantalla de Listado** (DataGrid o tabla de proveedores).
  - Diseño del **Formulario de Registro**, aplicando lineamientos premium (Dark Mode, Glassmorphism, paleta de colores cohesiva y botones interactivos).

## 2. Maquetación del Listado General
**Objetivo:** Traducir los mockups a código React/Next.js.

- **Componente de Tabla (`ProveedoresList.tsx`):**
  - Maquetación de la estructura de la tabla con estilos Tailwind CSS.
  - Definición de columnas clave: Cédula/RUC, Nombre, Ciudad, Tipo, Dirección, Teléfono, Email y Acciones.
  - Implementación de estados visuales vacíos (Empty states) y loaders.

## 3. Maquetación del Formulario y Validaciones Estáticas
**Objetivo:** Crear el componente de formulario con campos controlados y restringir el ingreso de datos erróneos mediante Regex.

- **Componente de Formulario (`ProveedorForm.tsx`):**
  - Maquetación estructurada de los campos solicitados:
    1. Cédula / RUC
    2. Nombre
    3. Ciudad
    4. Tipo (Select/Radio: Crédito / Contado)
    5. Dirección
    6. Teléfono
    7. Email
- **Implementación de Validaciones Estáticas (Regex) en el cliente:**
  - *Nombres:* Regex para bloquear números y caracteres especiales (solo letras y espacios).
  - *Correos:* Regex estándar para validar el formato `usuario@dominio.com`.
  - *Teléfonos:* Regex para validar longitud y códigos de área (ej. formato Ecuador `09...` o `02...`).
  - Renderizado condicional de mensajes de error de UI (texto en rojo bajo cada input) cuando no se cumple la expresión regular en tiempo real, antes de enviar el formulario al backend.

---
> [!NOTE] 
> *Nota: Las tareas de conexión con Apollo Client (Jairo), Resolvers/Soft Delete (Dario) y Pruebas (Esau) fueron excluidas de este plan según tu solicitud.*
