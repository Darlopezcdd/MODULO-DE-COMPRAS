-- ============================================================
--  MÓDULO DE COMPRAS — Base de datos completa y corregida
--  PostgreSQL 14+
--  HU1 → HU8 del documento de requerimientos
--
--  CORRECCIONES APLICADAS:
--    C1. estado en saldos_credito_proveedor: VARCHAR(20)+CHECK → ENUM estado_saldo_enum
--    C2. numero_factura: generado por la aplicación → secuencia PostgreSQL (seq_numero_factura)
--        para garantizar unicidad en inserciones concurrentes
--    C3. Índice compuesto (usuario_id, fecha_hora DESC) en pista_auditoria
--        para consultas HU8 CA3 por usuario + rango de fechas
--    C4. Índice parcial compuesto en saldos_credito_proveedor para reporte HU5
--        (proveedor_id WHERE estado = 'PENDIENTE')
--    C5. Consistencia soft-delete: CHECK que garantiza deleted_at IS NOT NULL
--        implica estado = 'INACTIVO' en proveedores
--
--  ORDEN DE EJECUCIÓN:
--    1. Extensiones
--    2. Tipos enumerados (ENUMs)
--    3. Secuencias
--    4. Tablas (en orden de dependencias)
--    5. Índices
--    6. Funciones y triggers
--    7. Vistas
-- ============================================================


-- ============================================================
-- 1. EXTENSIONES
-- ============================================================

-- pg_trgm: búsqueda eficiente por texto con ILIKE/LIKE (HU2 CA2, HU3 CA1)
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================
-- 2. TIPOS ENUMERADOS
-- ============================================================

-- HU1: tipo de proveedor
CREATE TYPE tipo_proveedor_enum AS ENUM (
    'CONTADO',
    'CREDITO'
);

-- HU1: estado del proveedor (CA3: no se elimina, se desactiva)
CREATE TYPE estado_proveedor_enum AS ENUM (
    'ACTIVO',
    'INACTIVO'
);

-- HU2: tipo de pago de la factura
CREATE TYPE tipo_pago_enum AS ENUM (
    'CONTADO',
    'CREDITO'
);

-- HU2 / HU4: ciclo de vida de la factura
--   BORRADOR → en edición, modificable
--   EMITIDA  → PDF generado, solo lectura (HU4 CA3)
--   ANULADA  → cancelada administrativamente
CREATE TYPE estado_factura_enum AS ENUM (
    'BORRADOR',
    'EMITIDA',
    'ANULADA'
);

-- HU8: acciones registradas en pista de auditoría
CREATE TYPE accion_auditoria_enum AS ENUM (
    'LOGIN',
    'LOGOUT',
    'CREAR',
    'ACTUALIZAR',
    'ELIMINAR',
    'IMPRIMIR'      -- HU4: impresión de PDF también se audita
);

-- HU5: estado del saldo de crédito por proveedor
-- CORRECCIÓN C1: se usa ENUM en lugar de VARCHAR(20)+CHECK para consistencia
-- con el resto de tipos del sistema y evitar valores incorrectos ('pendiente' en minúscula, etc.)
CREATE TYPE estado_saldo_enum AS ENUM (
    'PENDIENTE',
    'PAGADO',
    'VENCIDO'
);


-- ============================================================
-- 3. SECUENCIAS
-- ============================================================

-- CORRECCIÓN C2: secuencia propia para el número interno de factura.
-- Evita colisiones cuando dos usuarios crean facturas en paralelo.
-- Uso en la aplicación: SELECT NEXTVAL('public.seq_numero_factura')
-- o dejar que el DEFAULT de la columna lo genere automáticamente.
CREATE SEQUENCE IF NOT EXISTS public.seq_numero_factura
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

COMMENT ON SEQUENCE public.seq_numero_factura
    IS 'HU2: Genera el número interno de factura de compra de forma segura y sin colisiones concurrentes.';


-- ============================================================
-- 4. TABLAS
-- ============================================================

-- ------------------------------------------------------------
-- 4.1 PROVEEDORES (HU1)
-- ------------------------------------------------------------
-- Lógica de negocio implementada:
--   • Soft-delete: no se elimina físicamente (CA3).
--     El estado pasa a INACTIVO para desactivar.
--     deleted_at es complementario para compatibilidad.
--   • cedula_ruc única (CA2)
--   • Validación de email y teléfono con CHECK (CA1)
--   • Validación de nombre: solo letras, espacios y guiones (CA1)
--     NOTA: si los nombres de empresa pueden incluir números
--     (ej. "Empresa 3M"), eliminar chk_proveedores_nombre
--     y manejar esa validación únicamente en la aplicación.
-- ------------------------------------------------------------
CREATE TABLE public.proveedores (
    id               SERIAL                  PRIMARY KEY,
    cedula_ruc       VARCHAR(13)             NOT NULL,
    nombre           VARCHAR(150)            NOT NULL,
    ciudad           VARCHAR(100)            NOT NULL,
    tipo_proveedor   tipo_proveedor_enum     NOT NULL,
    direccion        TEXT                    NOT NULL,
    telefono         VARCHAR(20)             NOT NULL,
    email            VARCHAR(150)            NOT NULL,
    estado           estado_proveedor_enum   NOT NULL DEFAULT 'ACTIVO',

    -- Auditoría de registro (FK lógica al módulo de Seguridad)
    created_by       INTEGER                 NOT NULL,
    updated_by       INTEGER,
    created_at       TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,            -- soft-delete complementario

    -- Restricciones de negocio
    CONSTRAINT uq_proveedores_cedula_ruc
        UNIQUE (cedula_ruc),

    CONSTRAINT chk_proveedores_telefono
        CHECK (telefono ~ '^[0-9+\-\s()]{7,20}$'),

    CONSTRAINT chk_proveedores_email
        CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),

    CONSTRAINT chk_proveedores_nombre
        CHECK (nombre ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s.\-]+$'),

    -- CORRECCIÓN C5: consistencia entre deleted_at y estado.
    -- Si se marca deleted_at, el estado obligatoriamente debe ser INACTIVO.
    CONSTRAINT chk_proveedores_deleted_consistente
        CHECK (deleted_at IS NULL OR estado = 'INACTIVO')
);

COMMENT ON TABLE  public.proveedores
    IS 'HU1 – Catálogo de proveedores del módulo de compras.';
COMMENT ON COLUMN public.proveedores.estado
    IS 'CA3 HU1: El proveedor nunca se elimina físicamente; se cambia a INACTIVO.';
COMMENT ON COLUMN public.proveedores.cedula_ruc
    IS 'CA1-CA2 HU1: Cédula (10 dígitos) o RUC (13 dígitos). Único en el sistema.';
COMMENT ON COLUMN public.proveedores.tipo_proveedor
    IS 'HU2 CA3: Solo proveedores tipo CREDITO pueden tener facturas a crédito.';
COMMENT ON COLUMN public.proveedores.deleted_at
    IS 'Soft-delete complementario. El control principal de estado es la columna estado. Si deleted_at IS NOT NULL, estado debe ser INACTIVO (ver chk_proveedores_deleted_consistente).';


-- ------------------------------------------------------------
-- 4.2 FACTURAS DE COMPRA — CABECERA (HU2, HU4)
-- ------------------------------------------------------------
-- Lógica de negocio implementada:
--   • Fecha no puede ser futura (CA1 HU2)
--   • Tipo CREDITO requiere fecha_vencimiento >= fecha (CA4 HU2)
--   • Una factura con PDF generado no puede estar en BORRADOR
--   • numero_factura_proveedor: número impreso en el doc físico
--   • CORRECCIÓN C2: numero_factura usa DEFAULT con secuencia
-- ------------------------------------------------------------
CREATE TABLE public.facturas_compra (
    id                          SERIAL                  PRIMARY KEY,

    -- CORRECCIÓN C2: numero_factura generado por secuencia PostgreSQL.
    -- Formato: FC-00000001, FC-00000002, etc.
    -- Garantiza unicidad incluso con inserciones concurrentes.
    numero_factura              VARCHAR(20)             NOT NULL
                                    DEFAULT ('FC-' || LPAD(NEXTVAL('public.seq_numero_factura')::TEXT, 8, '0')),

    -- Número impreso en el documento físico del proveedor (HU2)
    numero_factura_proveedor    VARCHAR(50),

    fecha                       DATE                    NOT NULL,
    proveedor_id                INTEGER                 NOT NULL,
    tipo_pago                   tipo_pago_enum          NOT NULL,

    -- Obligatoria solo cuando tipo_pago = 'CREDITO' (CA4 HU2)
    fecha_vencimiento           DATE,

    -- Totales (recalculados automáticamente por trigger fn_recalcular_totales_factura)
    subtotal_sin_iva            NUMERIC(14,2)           NOT NULL DEFAULT 0,
    subtotal_con_iva            NUMERIC(14,2)           NOT NULL DEFAULT 0,
    total_iva                   NUMERIC(14,2)           NOT NULL DEFAULT 0,
    total                       NUMERIC(14,2)           NOT NULL DEFAULT 0,

    -- Ciclo de vida: BORRADOR → EMITIDA → ANULADA
    estado                      estado_factura_enum     NOT NULL DEFAULT 'BORRADOR',

    -- HU4: control de generación de PDF
    pdf_generado                BOOLEAN                 NOT NULL DEFAULT FALSE,
    pdf_url                     TEXT,                   -- TEXT para soportar URLs largas (S3, GCS, etc.)

    -- Campo libre para notas internas
    observaciones               TEXT,

    -- Auditoría de registro
    created_by                  INTEGER                 NOT NULL,
    updated_by                  INTEGER,
    created_at                  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    -- Restricciones
    CONSTRAINT uq_facturas_compra_numero
        UNIQUE (numero_factura),

    CONSTRAINT fk_facturas_compra_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id),

    -- CA1 HU2: la fecha de la factura no puede ser futura
    CONSTRAINT chk_facturas_fecha_no_futura
        CHECK (fecha <= CURRENT_DATE),

    -- CA4 HU2: si es crédito → vencimiento obligatorio y posterior a la fecha
    CONSTRAINT chk_facturas_vencimiento_credito
        CHECK (
            tipo_pago = 'CONTADO'
            OR (
                tipo_pago = 'CREDITO'
                AND fecha_vencimiento IS NOT NULL
                AND fecha_vencimiento >= fecha
            )
        ),

    -- HU4: consistencia entre estado y pdf_generado
    CONSTRAINT chk_facturas_pdf_emitida
        CHECK (NOT (pdf_generado = TRUE AND estado = 'BORRADOR'))
);

COMMENT ON TABLE  public.facturas_compra
    IS 'HU2 – Cabecera de facturas de compra.';
COMMENT ON COLUMN public.facturas_compra.estado
    IS 'BORRADOR=editable; EMITIDA=PDF generado, solo lectura (HU4 CA3); ANULADA=cancelada.';
COMMENT ON COLUMN public.facturas_compra.numero_factura
    IS 'CORRECCIÓN C2: Número interno generado automáticamente por seq_numero_factura. Formato FC-XXXXXXXX. Evita colisiones concurrentes.';
COMMENT ON COLUMN public.facturas_compra.numero_factura_proveedor
    IS 'HU2: Número impreso en el documento físico entregado por el proveedor.';
COMMENT ON COLUMN public.facturas_compra.fecha_vencimiento
    IS 'CA4 HU2: Requerida cuando tipo_pago=CREDITO. Debe ser >= fecha de la factura.';
COMMENT ON COLUMN public.facturas_compra.pdf_url
    IS 'HU4: Ruta o URL del archivo PDF generado. TEXT para soportar URLs largas de almacenamiento en nube.';
COMMENT ON COLUMN public.facturas_compra.subtotal_sin_iva
    IS 'HU3 CA4: Recalculado automáticamente por trigger al modificar el detalle.';
COMMENT ON COLUMN public.facturas_compra.total
    IS 'HU3 CA4: Recalculado automáticamente por trigger al modificar el detalle.';


-- ------------------------------------------------------------
-- 4.3 DETALLE DE FACTURA DE COMPRA (HU3)
-- ------------------------------------------------------------
-- Lógica de negocio implementada:
--   • producto_nombre y producto_codigo: snapshot histórico del
--     producto al momento de la compra (el inventario puede cambiar)
--   • cantidad > 0 (CA3 HU3)
--   • pvp >= 0
--   • Coherencia entre graba_iva y porcentaje_iva
--   • producto_id: referencia externa al módulo de Inventarios
--     (no hay FK porque es una BD distribuida)
-- ------------------------------------------------------------
CREATE TABLE public.detalle_factura_compra (
    id               SERIAL          PRIMARY KEY,
    factura_id       INTEGER         NOT NULL,

    -- Referencia externa al módulo de Inventarios (sin FK por ser BD distribuida)
    producto_id      INTEGER         NOT NULL,

    -- Snapshot del producto al momento de la compra (trazabilidad histórica)
    producto_nombre  VARCHAR(200)    NOT NULL,
    producto_codigo  VARCHAR(50)     NOT NULL,

    cantidad         NUMERIC(14,4)   NOT NULL,
    pvp              NUMERIC(14,2)   NOT NULL,

    -- IVA: viene de los atributos del producto en el módulo de Inventarios
    graba_iva        BOOLEAN         NOT NULL DEFAULT FALSE,
    porcentaje_iva   NUMERIC(5,2)    NOT NULL DEFAULT 0,    -- ej: 0, 5, 12, 15

    -- Totales de línea (calculados en la aplicación antes de INSERT/UPDATE)
    subtotal         NUMERIC(14,2)   NOT NULL DEFAULT 0,    -- cantidad * pvp
    valor_iva        NUMERIC(14,2)   NOT NULL DEFAULT 0,    -- subtotal * porcentaje_iva / 100
    total_linea      NUMERIC(14,2)   NOT NULL DEFAULT 0,    -- subtotal + valor_iva

    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Restricciones
    CONSTRAINT fk_detalle_factura
        FOREIGN KEY (factura_id) REFERENCES public.facturas_compra(id),

    -- CA3 HU3: cantidad debe ser un valor numérico válido y positivo
    CONSTRAINT chk_detalle_cantidad_positiva
        CHECK (cantidad > 0),

    CONSTRAINT chk_detalle_pvp_no_negativo
        CHECK (pvp >= 0),

    CONSTRAINT chk_detalle_porcentaje_iva_valido
        CHECK (porcentaje_iva >= 0 AND porcentaje_iva <= 100),

    -- CA2 HU3: coherencia entre graba_iva y porcentaje_iva
    CONSTRAINT chk_detalle_graba_iva_coherente
        CHECK (
            (graba_iva = FALSE AND porcentaje_iva = 0)
            OR
            (graba_iva = TRUE  AND porcentaje_iva > 0)
        )
);

COMMENT ON TABLE  public.detalle_factura_compra
    IS 'HU3 – Líneas de producto de cada factura de compra.';
COMMENT ON COLUMN public.detalle_factura_compra.producto_id
    IS 'Referencia externa al módulo de Inventarios. Sin FK por arquitectura distribuida.';
COMMENT ON COLUMN public.detalle_factura_compra.producto_nombre
    IS 'Snapshot del nombre al momento de la compra. El catálogo puede cambiar.';
COMMENT ON COLUMN public.detalle_factura_compra.producto_codigo
    IS 'Snapshot del código al momento de la compra.';
COMMENT ON COLUMN public.detalle_factura_compra.porcentaje_iva
    IS 'CA2 HU3: Valores legales Ecuador: 0, 5, 12, 15. Validado en la aplicación.';


-- ------------------------------------------------------------
-- 4.4 SALDOS DE CRÉDITO POR PROVEEDOR (HU5)
-- ------------------------------------------------------------
-- Registra el saldo pendiente de crédito por proveedor.
-- Se alimenta desde el módulo de Cuentas por Pagar (mencionado en HU5).
-- CORRECCIÓN C1: columna estado cambia de VARCHAR(20)+CHECK a ENUM estado_saldo_enum
-- ------------------------------------------------------------
CREATE TABLE public.saldos_credito_proveedor (
    id                  SERIAL              PRIMARY KEY,
    proveedor_id        INTEGER             NOT NULL,

    -- Factura origen del crédito (nullable: puede venir de Cuentas por Pagar)
    factura_id          INTEGER,

    monto_credito       NUMERIC(14,2)       NOT NULL DEFAULT 0,
    monto_pagado        NUMERIC(14,2)       NOT NULL DEFAULT 0,

    -- Columna calculada: monto_credito - monto_pagado
    saldo_pendiente     NUMERIC(14,2)
        GENERATED ALWAYS AS (monto_credito - monto_pagado) STORED,

    fecha_vencimiento   DATE,

    -- CORRECCIÓN C1: ENUM en lugar de VARCHAR(20)+CHECK
    estado              estado_saldo_enum   NOT NULL DEFAULT 'PENDIENTE',

    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    -- Restricciones
    CONSTRAINT fk_saldo_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id),

    CONSTRAINT fk_saldo_factura
        FOREIGN KEY (factura_id) REFERENCES public.facturas_compra(id),

    CONSTRAINT chk_saldo_montos_no_negativos
        CHECK (monto_credito >= 0 AND monto_pagado >= 0),

    -- Nota: en contabilidad real pueden existir sobrepagos (saldo a favor).
    -- Si el negocio lo requiere, eliminar esta restricción.
    CONSTRAINT chk_saldo_no_sobrepago
        CHECK (monto_pagado <= monto_credito)
);

COMMENT ON TABLE  public.saldos_credito_proveedor
    IS 'HU5 – Saldos de crédito vigentes por proveedor. Se alimenta desde el módulo Cuentas por Pagar.';
COMMENT ON COLUMN public.saldos_credito_proveedor.saldo_pendiente
    IS 'Columna calculada (GENERATED ALWAYS AS): monto_credito − monto_pagado.';
COMMENT ON COLUMN public.saldos_credito_proveedor.factura_id
    IS 'Nullable: el saldo puede originarse en Cuentas por Pagar sin factura directa en este módulo.';
COMMENT ON COLUMN public.saldos_credito_proveedor.estado
    IS 'CORRECCIÓN C1: ENUM estado_saldo_enum (PENDIENTE/PAGADO/VENCIDO). Reemplaza VARCHAR(20)+CHECK del original.';


-- ------------------------------------------------------------
-- 4.5 SESIONES DE USUARIO (HU7)
-- ------------------------------------------------------------
-- Registra tokens JWT activos para gestionar logout y expiración.
-- Permite invalidar tokens específicos por jti claim.
-- ------------------------------------------------------------
CREATE TABLE public.sesiones_usuario (
    id                  BIGSERIAL       PRIMARY KEY,

    -- FK lógica al módulo de Seguridad (BD distribuida, sin FK física)
    usuario_id          INTEGER         NOT NULL,
    -- Snapshot del nombre al momento del login (el nombre puede cambiar en Seguridad)
    usuario_nombre      VARCHAR(150)    NOT NULL,

    -- JWT ID (claim jti): identificador único del token
    token_jti           VARCHAR(100)    NOT NULL,

    ip_address          VARCHAR(45),    -- VARCHAR(45) soporta IPv4 e IPv6
    user_agent          VARCHAR(300),

    fecha_login         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    fecha_expiracion    TIMESTAMPTZ     NOT NULL,

    -- NULL mientras la sesión está activa; se rellena en logout
    fecha_logout        TIMESTAMPTZ,

    activa              BOOLEAN         NOT NULL DEFAULT TRUE,

    -- Restricciones
    CONSTRAINT uq_sesiones_token
        UNIQUE (token_jti)
);

COMMENT ON TABLE  public.sesiones_usuario
    IS 'HU7 – Control de sesiones JWT activas del módulo de compras.';
COMMENT ON COLUMN public.sesiones_usuario.token_jti
    IS 'Claim jti del JWT. Permite invalidar tokens específicos en logout (HU7 CA logout).';
COMMENT ON COLUMN public.sesiones_usuario.activa
    IS 'FALSE cuando el usuario hizo logout o el token expiró.';
COMMENT ON COLUMN public.sesiones_usuario.usuario_nombre
    IS 'Snapshot del nombre al momento del login. Puede diferir de pista_auditoria si el nombre cambió entre sesiones — ambos son snapshots independientes, lo cual es correcto por diseño distribuido.';


-- ------------------------------------------------------------
-- 4.6 PISTA DE AUDITORÍA (HU8)
-- ------------------------------------------------------------
-- Registro inmutable de todas las acciones de usuarios.
-- BIGSERIAL porque el volumen de registros puede ser muy alto.
-- Esta tabla NUNCA debe tener UPDATE ni DELETE (inmutabilidad).
-- ------------------------------------------------------------
CREATE TABLE public.pista_auditoria (
    id                  BIGSERIAL               PRIMARY KEY,
    fecha_hora          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    -- CA2 HU8: usuario que ejecutó la acción
    usuario_id          INTEGER                 NOT NULL,
    -- Snapshot del nombre en el momento de la acción
    usuario_nombre      VARCHAR(150)            NOT NULL,

    -- CA1 HU8: tipo de acción
    accion              accion_auditoria_enum   NOT NULL,

    -- Contexto del módulo y tabla afectada
    modulo              VARCHAR(50)             NOT NULL DEFAULT 'COMPRAS',
    tabla_afectada      VARCHAR(100)            NOT NULL,

    -- ID del registro afectado (nullable para LOGIN/LOGOUT que no afectan registros)
    registro_id         BIGINT,

    -- CA2 HU8: datos antes y después de la modificación
    datos_anteriores    JSONB,
    datos_nuevos        JSONB,

    -- Resultado de la operación
    resultado           VARCHAR(10)             NOT NULL DEFAULT 'EXITO',
    descripcion         TEXT,                   -- mensaje de error o detalle adicional

    -- Origen de la petición
    ip_address          VARCHAR(45),
    user_agent          VARCHAR(300),

    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    -- Restricciones
    CONSTRAINT chk_auditoria_resultado
        CHECK (resultado IN ('EXITO', 'ERROR'))
);

COMMENT ON TABLE  public.pista_auditoria
    IS 'HU8 – Registro inmutable de todas las acciones de usuarios en el módulo de Compras.';
COMMENT ON COLUMN public.pista_auditoria.accion
    IS 'CA1 HU8: LOGIN, LOGOUT, CREAR, ACTUALIZAR, ELIMINAR + IMPRIMIR (HU4).';
COMMENT ON COLUMN public.pista_auditoria.registro_id
    IS 'Nullable: LOGIN y LOGOUT no afectan un registro específico.';
COMMENT ON COLUMN public.pista_auditoria.datos_anteriores
    IS 'CA2 HU8: Snapshot JSON del registro ANTES de la modificación.';
COMMENT ON COLUMN public.pista_auditoria.datos_nuevos
    IS 'CA2 HU8: Snapshot JSON del registro DESPUÉS de la modificación.';


-- ============================================================
-- 5. ÍNDICES
-- ============================================================

-- ---- Proveedores ----
-- Estado activo/inactivo (listados en HU2)
CREATE INDEX idx_proveedores_estado
    ON public.proveedores(estado);

-- Tipo de proveedor (validación crédito/contado en HU2 CA3)
CREATE INDEX idx_proveedores_tipo
    ON public.proveedores(tipo_proveedor);

-- Búsqueda fuzzy por nombre (HU2 CA2: buscar proveedor)
CREATE INDEX idx_proveedores_nombre_trgm
    ON public.proveedores USING gin(nombre gin_trgm_ops);

-- Búsqueda fuzzy por cédula/ruc
CREATE INDEX idx_proveedores_cedula_trgm
    ON public.proveedores USING gin(cedula_ruc gin_trgm_ops);


-- ---- Facturas de compra ----
-- Filtro por fecha (HU6 CA1: rango de fechas en reportes)
CREATE INDEX idx_facturas_fecha
    ON public.facturas_compra(fecha);

-- Acceso por proveedor
CREATE INDEX idx_facturas_proveedor
    ON public.facturas_compra(proveedor_id);

-- Filtro por estado (BORRADOR/EMITIDA/ANULADA)
CREATE INDEX idx_facturas_estado
    ON public.facturas_compra(estado);

-- Filtro por tipo de pago (crédito/contado)
CREATE INDEX idx_facturas_tipo_pago
    ON public.facturas_compra(tipo_pago);

-- Facturas a crédito próximas a vencer (HU5 reporte)
CREATE INDEX idx_facturas_vencimiento
    ON public.facturas_compra(fecha_vencimiento)
    WHERE tipo_pago = 'CREDITO' AND estado = 'EMITIDA';


-- ---- Detalle de factura ----
-- Acceso rápido por factura (HU6: reporte detallado por productos)
CREATE INDEX idx_detalle_factura_id
    ON public.detalle_factura_compra(factura_id);

-- Acceso por producto (para reportes de compras por producto)
CREATE INDEX idx_detalle_producto_id
    ON public.detalle_factura_compra(producto_id);

-- Búsqueda fuzzy por nombre de producto (HU3 CA1: buscar producto en detalle)
CREATE INDEX idx_detalle_producto_nombre_trgm
    ON public.detalle_factura_compra USING gin(producto_nombre gin_trgm_ops);

-- Búsqueda por código de producto (HU3 CA1)
CREATE INDEX idx_detalle_producto_codigo
    ON public.detalle_factura_compra(producto_codigo);


-- ---- Saldos de crédito ----
-- Consultas HU5: saldos por proveedor
CREATE INDEX idx_saldos_proveedor_id
    ON public.saldos_credito_proveedor(proveedor_id);

-- Saldos pendientes por estado general
CREATE INDEX idx_saldos_estado
    ON public.saldos_credito_proveedor(estado);

-- CORRECCIÓN C4: índice parcial compuesto para reporte HU5.
-- La consulta más común es "saldos PENDIENTES de un proveedor específico".
-- Un índice parcial es más pequeño y rápido que un índice completo.
CREATE INDEX idx_saldos_proveedor_pendiente
    ON public.saldos_credito_proveedor(proveedor_id)
    WHERE estado = 'PENDIENTE';


-- ---- Sesiones de usuario ----
-- Búsqueda de sesiones activas por usuario (HU7)
CREATE INDEX idx_sesiones_usuario_activa
    ON public.sesiones_usuario(usuario_id, activa);

-- Búsqueda por token (validación JWT)
CREATE INDEX idx_sesiones_token_jti
    ON public.sesiones_usuario(token_jti);


-- ---- Pista de auditoría ----
-- Consultas por usuario solo (cuando se necesita todo el historial de un usuario)
CREATE INDEX idx_auditoria_usuario_id
    ON public.pista_auditoria(usuario_id);

-- CORRECCIÓN C3: índice compuesto (usuario_id, fecha_hora DESC) para HU8 CA3.
-- La consulta típica de auditoría es "acciones del usuario X entre fecha A y fecha B".
-- Este índice resuelve ese filtro en un solo recorrido de índice.
CREATE INDEX idx_auditoria_usuario_fecha
    ON public.pista_auditoria(usuario_id, fecha_hora DESC);

-- Consultas por rango de fechas sin filtro de usuario
CREATE INDEX idx_auditoria_fecha_hora
    ON public.pista_auditoria(fecha_hora);

-- Consultas por tabla afectada
CREATE INDEX idx_auditoria_tabla
    ON public.pista_auditoria(tabla_afectada);

-- Consultas por tipo de acción
CREATE INDEX idx_auditoria_accion
    ON public.pista_auditoria(accion);


-- ============================================================
-- 6. FUNCIONES Y TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- 6.1 Actualizar updated_at automáticamente
-- ------------------------------------------------------------
-- Se aplica a todas las tablas que tienen la columna updated_at.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_set_updated_at()
    IS 'Actualiza automáticamente updated_at antes de cada UPDATE.';

CREATE TRIGGER trg_proveedores_updated_at
    BEFORE UPDATE ON public.proveedores
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_facturas_updated_at
    BEFORE UPDATE ON public.facturas_compra
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_detalle_updated_at
    BEFORE UPDATE ON public.detalle_factura_compra
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_saldos_updated_at
    BEFORE UPDATE ON public.saldos_credito_proveedor
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ------------------------------------------------------------
-- 6.2 Bloquear modificación de CABECERA de factura emitida (HU4 CA3)
-- ------------------------------------------------------------
-- Después de generar el PDF (estado = EMITIDA), la factura
-- no puede modificarse. La única excepción es pasar a ANULADA.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_bloquear_factura_emitida()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.estado = 'EMITIDA' THEN
        -- Única operación permitida sobre una factura emitida: anularla
        IF NOT (NEW.estado = 'ANULADA') THEN
            RAISE EXCEPTION
                'La factura % ya fue emitida en PDF y no puede modificarse. '
                'Solo se permite cambiar el estado a ANULADA. (HU4-CA3)',
                OLD.numero_factura
                USING ERRCODE = 'P0001';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_bloquear_factura_emitida()
    IS 'HU4-CA3: Impide modificar cualquier campo de una factura con estado EMITIDA. Solo permite anularla.';

CREATE TRIGGER trg_bloquear_factura_emitida
    BEFORE UPDATE ON public.facturas_compra
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_factura_emitida();


-- ------------------------------------------------------------
-- 6.3 Bloquear modificación del DETALLE de factura emitida (HU4 CA3)
-- ------------------------------------------------------------
-- Complemento al trigger anterior: protege el detalle para que
-- no se pueda insertar, modificar ni eliminar líneas de una
-- factura que ya fue emitida en PDF.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_bloquear_detalle_factura_emitida()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_estado estado_factura_enum;
BEGIN
    SELECT estado INTO v_estado
    FROM public.facturas_compra
    WHERE id = COALESCE(NEW.factura_id, OLD.factura_id);

    IF v_estado = 'EMITIDA' THEN
        RAISE EXCEPTION
            'No se puede modificar el detalle de una factura ya emitida en PDF. (HU4-CA3)'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION fn_bloquear_detalle_factura_emitida()
    IS 'HU4-CA3: Impide INSERT/UPDATE/DELETE en el detalle cuando la factura padre está EMITIDA.';

CREATE TRIGGER trg_bloquear_detalle_emitida
    BEFORE INSERT OR UPDATE OR DELETE ON public.detalle_factura_compra
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_detalle_factura_emitida();


-- ------------------------------------------------------------
-- 6.4 Recalcular totales de la factura (HU3 CA4)
-- ------------------------------------------------------------
-- Se dispara después de cada INSERT, UPDATE o DELETE en el
-- detalle para mantener los totales de la cabecera actualizados.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_recalcular_totales_factura()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_factura_id INTEGER;
BEGIN
    -- Determinar la factura afectada
    IF TG_OP = 'DELETE' THEN
        v_factura_id := OLD.factura_id;
    ELSE
        v_factura_id := NEW.factura_id;
    END IF;

    -- Recalcular y actualizar totales en la cabecera
    UPDATE public.facturas_compra
    SET
        subtotal_sin_iva = COALESCE((
            SELECT SUM(subtotal)
            FROM   public.detalle_factura_compra
            WHERE  factura_id = v_factura_id
              AND  graba_iva = FALSE
        ), 0),

        subtotal_con_iva = COALESCE((
            SELECT SUM(subtotal)
            FROM   public.detalle_factura_compra
            WHERE  factura_id = v_factura_id
              AND  graba_iva = TRUE
        ), 0),

        total_iva = COALESCE((
            SELECT SUM(valor_iva)
            FROM   public.detalle_factura_compra
            WHERE  factura_id = v_factura_id
        ), 0),

        total = COALESCE((
            SELECT SUM(total_linea)
            FROM   public.detalle_factura_compra
            WHERE  factura_id = v_factura_id
        ), 0),

        updated_at = NOW()

    WHERE id = v_factura_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION fn_recalcular_totales_factura()
    IS 'HU3-CA4: Recalcula subtotales, IVA y total de cabecera al modificar el detalle.';

CREATE TRIGGER trg_recalcular_totales_factura
    AFTER INSERT OR UPDATE OR DELETE ON public.detalle_factura_compra
    FOR EACH ROW EXECUTE FUNCTION fn_recalcular_totales_factura();


-- ============================================================
-- 7. VISTAS
-- ============================================================

-- ------------------------------------------------------------
-- 7.1 Reporte de proveedores con saldos de crédito (HU5)
-- ------------------------------------------------------------
-- Lista todos los proveedores con sus saldos de crédito
-- acumulados. CA2 HU5: si no tiene saldo, muestra 0.
-- Uso: SELECT * FROM vw_reporte_proveedores_saldos;
--      SELECT * FROM vw_reporte_proveedores_saldos WHERE estado = 'ACTIVO';
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_reporte_proveedores_saldos AS
SELECT
    p.id                                AS proveedor_id,
    p.cedula_ruc,
    p.nombre,
    p.ciudad,
    p.tipo_proveedor,
    p.direccion,
    p.telefono,
    p.email,
    p.estado,

    -- Saldos de crédito (0 si el proveedor no tiene créditos)
    COALESCE(s.total_credito,   0)      AS total_credito,
    COALESCE(s.total_pagado,    0)      AS total_pagado,
    COALESCE(s.saldo_pendiente, 0)      AS saldo_pendiente,

    -- Próxima fecha de vencimiento de créditos pendientes
    s.proxima_vencimiento

FROM public.proveedores p
LEFT JOIN (
    SELECT
        proveedor_id,
        SUM(monto_credito)      AS total_credito,
        SUM(monto_pagado)       AS total_pagado,
        SUM(saldo_pendiente)    AS saldo_pendiente,
        MIN(fecha_vencimiento)
            FILTER (WHERE estado = 'PENDIENTE')
                                AS proxima_vencimiento
    FROM public.saldos_credito_proveedor
    GROUP BY proveedor_id
) s ON s.proveedor_id = p.id;

COMMENT ON VIEW public.vw_reporte_proveedores_saldos
    IS 'HU5 – Lista proveedores con saldos de crédito acumulados. Filtrar por estado para activos/inactivos.';


-- ------------------------------------------------------------
-- 7.2 Reporte de facturas detallado por productos (HU6)
-- ------------------------------------------------------------
-- Detalle completo de facturas con sus productos.
-- CA1 HU6: filtrar por rango de fechas en la consulta:
--   SELECT * FROM vw_reporte_facturas_detalle
--   WHERE fecha BETWEEN '2025-01-01' AND '2025-12-31';
-- CA3 HU6: la exportación a PDF o CSV se realiza en la
--   capa de aplicación usando los datos de esta vista.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_reporte_facturas_detalle AS
SELECT
    -- Datos de la factura
    fc.id                           AS factura_id,
    fc.numero_factura,
    fc.numero_factura_proveedor,
    fc.fecha,
    fc.estado                       AS estado_factura,
    fc.tipo_pago,
    fc.fecha_vencimiento,

    -- Datos del proveedor
    p.id                            AS proveedor_id,
    p.cedula_ruc                    AS proveedor_cedula_ruc,
    p.nombre                        AS proveedor_nombre,
    p.tipo_proveedor,

    -- Datos del producto (línea de detalle)
    d.id                            AS detalle_id,
    d.producto_id,
    d.producto_codigo,
    d.producto_nombre,
    d.cantidad,
    d.pvp,
    d.graba_iva,
    d.porcentaje_iva,
    d.subtotal                      AS linea_subtotal,
    d.valor_iva                     AS linea_valor_iva,
    d.total_linea,

    -- Totales de la factura
    fc.subtotal_sin_iva             AS factura_subtotal_sin_iva,
    fc.subtotal_con_iva             AS factura_subtotal_con_iva,
    fc.total_iva                    AS factura_total_iva,
    fc.total                        AS factura_total

FROM public.facturas_compra fc
JOIN public.proveedores            p ON p.id = fc.proveedor_id
JOIN public.detalle_factura_compra d ON d.factura_id = fc.id;

COMMENT ON VIEW public.vw_reporte_facturas_detalle
    IS 'HU6 – Detalle de facturas de compra por producto. '
       'Filtrar con WHERE fecha BETWEEN :inicio AND :fin para el reporte por rango de fechas (CA1 HU6).';


-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
