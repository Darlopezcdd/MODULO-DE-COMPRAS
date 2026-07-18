--
-- PostgreSQL database dump
--

\restrict X5MComKAIsREptvE8ubekgXMbqrg2PBefNXqIHaxy7pKTUDZdpTfzb6s2pJTagN

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: EstadoProveedor; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoProveedor" AS ENUM (
    'ACTIVO',
    'INACTIVO'
);


--
-- Name: TipoProveedor; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoProveedor" AS ENUM (
    'CONTADO',
    'CREDITO'
);


--
-- Name: accion_audit_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.accion_audit_enum AS ENUM (
    'LOGIN',
    'LOGOUT',
    'CREAR',
    'ACTUALIZAR',
    'ELIMINAR',
    'IMPRIMIR',
    'EXPORTAR'
);


--
-- Name: accion_auditoria_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.accion_auditoria_enum AS ENUM (
    'LOGIN',
    'LOGOUT',
    'CREAR',
    'ACTUALIZAR',
    'ELIMINAR',
    'IMPRIMIR'
);


--
-- Name: estado_factura_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_factura_enum AS ENUM (
    'BORRADOR',
    'EMITIDA',
    'ANULADA'
);


--
-- Name: estado_proveedor_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_proveedor_enum AS ENUM (
    'ACTIVO',
    'INACTIVO'
);


--
-- Name: estado_saldo_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_saldo_enum AS ENUM (
    'PENDIENTE',
    'PAGADO',
    'VENCIDO'
);


--
-- Name: tipo_pago_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_pago_enum AS ENUM (
    'CONTADO',
    'CREDITO'
);


--
-- Name: tipo_proveedor_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_proveedor_enum AS ENUM (
    'CONTADO',
    'CREDITO'
);


--
-- Name: fn_bloquear_detalle_factura_emitida(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bloquear_detalle_factura_emitida() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: FUNCTION fn_bloquear_detalle_factura_emitida(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_bloquear_detalle_factura_emitida() IS 'HU4-CA3: Impide INSERT/UPDATE/DELETE en el detalle cuando la factura padre está EMITIDA.';


--
-- Name: fn_bloquear_factura_emitida(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bloquear_factura_emitida() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: FUNCTION fn_bloquear_factura_emitida(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_bloquear_factura_emitida() IS 'HU4-CA3: Impide modificar cualquier campo de una factura con estado EMITIDA. Solo permite anularla.';


--
-- Name: fn_recalcular_totales_factura(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_recalcular_totales_factura() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: FUNCTION fn_recalcular_totales_factura(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_recalcular_totales_factura() IS 'HU3-CA4: Recalcula subtotales, IVA y total de cabecera al modificar el detalle.';


--
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION fn_set_updated_at(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_set_updated_at() IS 'Actualiza automáticamente updated_at antes de cada UPDATE.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: catalogo_proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalogo_proveedor (
    id integer NOT NULL,
    proveedor_id integer NOT NULL,
    producto_codigo character varying(50) NOT NULL,
    precio_compra numeric(14,2) NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: catalogo_proveedor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.catalogo_proveedor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: catalogo_proveedor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.catalogo_proveedor_id_seq OWNED BY public.catalogo_proveedor.id;


--
-- Name: detalle_factura_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_factura_compra (
    id integer NOT NULL,
    factura_id integer NOT NULL,
    producto_id integer NOT NULL,
    producto_nombre character varying(200) NOT NULL,
    producto_codigo character varying(50) NOT NULL,
    cantidad numeric(14,4) NOT NULL,
    pvp numeric(14,2) NOT NULL,
    graba_iva boolean DEFAULT false NOT NULL,
    porcentaje_iva numeric(5,2) DEFAULT 0 NOT NULL,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    valor_iva numeric(14,2) DEFAULT 0 NOT NULL,
    total_linea numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_detalle_cantidad_positiva CHECK ((cantidad > (0)::numeric)),
    CONSTRAINT chk_detalle_graba_iva_coherente CHECK ((((graba_iva = false) AND (porcentaje_iva = (0)::numeric)) OR ((graba_iva = true) AND (porcentaje_iva > (0)::numeric)))),
    CONSTRAINT chk_detalle_porcentaje_iva_valido CHECK (((porcentaje_iva >= (0)::numeric) AND (porcentaje_iva <= (100)::numeric))),
    CONSTRAINT chk_detalle_pvp_no_negativo CHECK ((pvp >= (0)::numeric))
);


--
-- Name: TABLE detalle_factura_compra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.detalle_factura_compra IS 'HU3 – Líneas de producto de cada factura de compra.';


--
-- Name: COLUMN detalle_factura_compra.producto_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.detalle_factura_compra.producto_id IS 'Referencia externa al módulo de Inventarios. Sin FK por arquitectura distribuida.';


--
-- Name: COLUMN detalle_factura_compra.producto_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.detalle_factura_compra.producto_nombre IS 'Snapshot del nombre al momento de la compra. El catálogo puede cambiar.';


--
-- Name: COLUMN detalle_factura_compra.producto_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.detalle_factura_compra.producto_codigo IS 'Snapshot del código al momento de la compra.';


--
-- Name: COLUMN detalle_factura_compra.porcentaje_iva; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.detalle_factura_compra.porcentaje_iva IS 'CA2 HU3: Valores legales Ecuador: 0, 5, 12, 15. Validado en la aplicación.';


--
-- Name: detalle_factura_compra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_factura_compra_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_factura_compra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_factura_compra_id_seq OWNED BY public.detalle_factura_compra.id;


--
-- Name: seq_numero_factura; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_numero_factura
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SEQUENCE seq_numero_factura; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON SEQUENCE public.seq_numero_factura IS 'HU2: Genera el número interno de factura de compra de forma segura y sin colisiones concurrentes.';


--
-- Name: facturas_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facturas_compra (
    id integer NOT NULL,
    numero_factura character varying(20) DEFAULT ('FC-'::text || lpad((nextval('public.seq_numero_factura'::regclass))::text, 8, '0'::text)) NOT NULL,
    numero_factura_proveedor character varying(50),
    fecha date NOT NULL,
    proveedor_id integer NOT NULL,
    tipo_pago public.tipo_pago_enum NOT NULL,
    fecha_vencimiento date,
    subtotal_sin_iva numeric(14,2) DEFAULT 0 NOT NULL,
    subtotal_con_iva numeric(14,2) DEFAULT 0 NOT NULL,
    total_iva numeric(14,2) DEFAULT 0 NOT NULL,
    total numeric(14,2) DEFAULT 0 NOT NULL,
    estado public.estado_factura_enum DEFAULT 'BORRADOR'::public.estado_factura_enum NOT NULL,
    pdf_generado boolean DEFAULT false NOT NULL,
    pdf_url text,
    observaciones text,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_facturas_fecha_no_futura CHECK ((fecha <= CURRENT_DATE)),
    CONSTRAINT chk_facturas_pdf_emitida CHECK ((NOT ((pdf_generado = true) AND (estado = 'BORRADOR'::public.estado_factura_enum)))),
    CONSTRAINT chk_facturas_vencimiento_credito CHECK (((tipo_pago = 'CONTADO'::public.tipo_pago_enum) OR ((tipo_pago = 'CREDITO'::public.tipo_pago_enum) AND (fecha_vencimiento IS NOT NULL) AND (fecha_vencimiento >= fecha))))
);


--
-- Name: TABLE facturas_compra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.facturas_compra IS 'HU2 – Cabecera de facturas de compra.';


--
-- Name: COLUMN facturas_compra.numero_factura; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas_compra.numero_factura IS 'CORRECCIÓN C2: Número interno generado automáticamente por seq_numero_factura. Formato FC-XXXXXXXX. Evita colisiones concurrentes.';


--
-- Name: COLUMN facturas_compra.numero_factura_proveedor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas_compra.numero_factura_proveedor IS 'HU2: Número impreso en el documento físico entregado por el proveedor.';


--
-- Name: COLUMN facturas_compra.fecha_vencimiento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas_compra.fecha_vencimiento IS 'CA4 HU2: Requerida cuando tipo_pago=CREDITO. Debe ser >= fecha de la factura.';


--
-- Name: COLUMN facturas_compra.subtotal_sin_iva; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas_compra.subtotal_sin_iva IS 'HU3 CA4: Recalculado automáticamente por trigger al modificar el detalle.';


--
-- Name: COLUMN facturas_compra.total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas_compra.total IS 'HU3 CA4: Recalculado automáticamente por trigger al modificar el detalle.';


--
-- Name: COLUMN facturas_compra.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas_compra.estado IS 'BORRADOR=editable; EMITIDA=PDF generado, solo lectura (HU4 CA3); ANULADA=cancelada.';


--
-- Name: COLUMN facturas_compra.pdf_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas_compra.pdf_url IS 'HU4: Ruta o URL del archivo PDF generado. TEXT para soportar URLs largas de almacenamiento en nube.';


--
-- Name: facturas_compra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facturas_compra_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facturas_compra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facturas_compra_id_seq OWNED BY public.facturas_compra.id;


--
-- Name: gastos_cxc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gastos_cxc (
    id integer NOT NULL,
    cuenta_bancaria_id character varying(100) NOT NULL,
    monto numeric(14,2) NOT NULL,
    motivo text,
    factura_id integer,
    saldo_credito_id integer,
    fecha_pago timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sincronizado boolean DEFAULT false NOT NULL
);


--
-- Name: gastos_cxc_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gastos_cxc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gastos_cxc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gastos_cxc_id_seq OWNED BY public.gastos_cxc.id;


--
-- Name: pista_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pista_auditoria (
    id bigint NOT NULL,
    fecha_hora timestamp with time zone DEFAULT now() NOT NULL,
    usuario_id integer NOT NULL,
    usuario_nombre character varying(150) NOT NULL,
    accion public.accion_auditoria_enum NOT NULL,
    modulo character varying(50) DEFAULT 'COMPRAS'::character varying NOT NULL,
    tabla_afectada character varying(100) NOT NULL,
    registro_id bigint,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    resultado character varying(10) DEFAULT 'EXITO'::character varying NOT NULL,
    descripcion text,
    ip_address character varying(45),
    user_agent character varying(300),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_auditoria_resultado CHECK (((resultado)::text = ANY ((ARRAY['EXITO'::character varying, 'ERROR'::character varying])::text[])))
);


--
-- Name: pista_auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pista_auditoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pista_auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pista_auditoria_id_seq OWNED BY public.pista_auditoria.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    cedula_ruc character varying(13) NOT NULL,
    nombre character varying(150) NOT NULL,
    ciudad character varying(100) NOT NULL,
    tipo_proveedor public.tipo_proveedor_enum NOT NULL,
    direccion text NOT NULL,
    telefono character varying(20) NOT NULL,
    email character varying(150) NOT NULL,
    estado public.estado_proveedor_enum DEFAULT 'ACTIVO'::public.estado_proveedor_enum NOT NULL,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    banco character varying(100),
    numero_cuenta character varying(50),
    tipo_cuenta character varying(50),
    CONSTRAINT chk_proveedores_deleted_consistente CHECK (((deleted_at IS NULL) OR (estado = 'INACTIVO'::public.estado_proveedor_enum))),
    CONSTRAINT chk_proveedores_email CHECK (((email)::text ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT chk_proveedores_nombre CHECK (((nombre)::text ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s.\-]+$'::text)),
    CONSTRAINT chk_proveedores_telefono CHECK (((telefono)::text ~ '^[0-9+\-\s()]{7,20}$'::text))
);


--
-- Name: TABLE proveedores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proveedores IS 'HU1 – Catálogo de proveedores del módulo de compras.';


--
-- Name: COLUMN proveedores.cedula_ruc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proveedores.cedula_ruc IS 'CA1-CA2 HU1: Cédula (10 dígitos) o RUC (13 dígitos). Único en el sistema.';


--
-- Name: COLUMN proveedores.tipo_proveedor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proveedores.tipo_proveedor IS 'HU2 CA3: Solo proveedores tipo CREDITO pueden tener facturas a crédito.';


--
-- Name: COLUMN proveedores.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proveedores.estado IS 'CA3 HU1: El proveedor nunca se elimina físicamente; se cambia a INACTIVO.';


--
-- Name: COLUMN proveedores.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proveedores.deleted_at IS 'Soft-delete complementario. El control principal de estado es la columna estado. Si deleted_at IS NOT NULL, estado debe ser INACTIVO (ver chk_proveedores_deleted_consistente).';


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: saldos_credito_proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saldos_credito_proveedor (
    id integer NOT NULL,
    proveedor_id integer NOT NULL,
    factura_id integer,
    monto_credito numeric(14,2) DEFAULT 0 NOT NULL,
    monto_pagado numeric(14,2) DEFAULT 0 NOT NULL,
    fecha_vencimiento date,
    estado public.estado_saldo_enum DEFAULT 'PENDIENTE'::public.estado_saldo_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    saldo_pendiente numeric(14,2) GENERATED ALWAYS AS ((monto_credito - monto_pagado)) STORED,
    CONSTRAINT chk_saldo_montos_no_negativos CHECK (((monto_credito >= (0)::numeric) AND (monto_pagado >= (0)::numeric))),
    CONSTRAINT chk_saldo_no_sobrepago CHECK ((monto_pagado <= monto_credito))
);


--
-- Name: TABLE saldos_credito_proveedor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.saldos_credito_proveedor IS 'HU5 – Saldos de crédito vigentes por proveedor. Se alimenta desde el módulo Cuentas por Pagar.';


--
-- Name: COLUMN saldos_credito_proveedor.factura_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.saldos_credito_proveedor.factura_id IS 'Nullable: el saldo puede originarse en Cuentas por Pagar sin factura directa en este módulo.';


--
-- Name: COLUMN saldos_credito_proveedor.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.saldos_credito_proveedor.estado IS 'CORRECCIÓN C1: ENUM estado_saldo_enum (PENDIENTE/PAGADO/VENCIDO). Reemplaza VARCHAR(20)+CHECK del original.';


--
-- Name: saldos_credito_proveedor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.saldos_credito_proveedor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saldos_credito_proveedor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saldos_credito_proveedor_id_seq OWNED BY public.saldos_credito_proveedor.id;


--
-- Name: vw_reporte_facturas_detalle; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_reporte_facturas_detalle AS
 SELECT fc.id AS factura_id,
    fc.numero_factura,
    fc.numero_factura_proveedor,
    fc.fecha,
    fc.estado AS estado_factura,
    fc.tipo_pago,
    fc.fecha_vencimiento,
    p.id AS proveedor_id,
    p.cedula_ruc AS proveedor_cedula_ruc,
    p.nombre AS proveedor_nombre,
    p.tipo_proveedor,
    d.id AS detalle_id,
    d.producto_id,
    d.producto_codigo,
    d.producto_nombre,
    d.cantidad,
    d.pvp,
    d.graba_iva,
    d.porcentaje_iva,
    d.subtotal AS linea_subtotal,
    d.valor_iva AS linea_valor_iva,
    d.total_linea,
    fc.subtotal_sin_iva AS factura_subtotal_sin_iva,
    fc.subtotal_con_iva AS factura_subtotal_con_iva,
    fc.total_iva AS factura_total_iva,
    fc.total AS factura_total
   FROM ((public.facturas_compra fc
     JOIN public.proveedores p ON ((p.id = fc.proveedor_id)))
     JOIN public.detalle_factura_compra d ON ((d.factura_id = fc.id)));


--
-- Name: VIEW vw_reporte_facturas_detalle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_reporte_facturas_detalle IS 'HU6 – Detalle de facturas de compra por producto. Filtrar con WHERE fecha BETWEEN :inicio AND :fin para el reporte por rango de fechas (CA1 HU6).';


--
-- Name: catalogo_proveedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_proveedor ALTER COLUMN id SET DEFAULT nextval('public.catalogo_proveedor_id_seq'::regclass);


--
-- Name: detalle_factura_compra id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura_compra ALTER COLUMN id SET DEFAULT nextval('public.detalle_factura_compra_id_seq'::regclass);


--
-- Name: facturas_compra id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_compra ALTER COLUMN id SET DEFAULT nextval('public.facturas_compra_id_seq'::regclass);


--
-- Name: gastos_cxc id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gastos_cxc ALTER COLUMN id SET DEFAULT nextval('public.gastos_cxc_id_seq'::regclass);


--
-- Name: pista_auditoria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pista_auditoria ALTER COLUMN id SET DEFAULT nextval('public.pista_auditoria_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: saldos_credito_proveedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saldos_credito_proveedor ALTER COLUMN id SET DEFAULT nextval('public.saldos_credito_proveedor_id_seq'::regclass);


--
-- Data for Name: catalogo_proveedor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.catalogo_proveedor (id, proveedor_id, producto_codigo, precio_compra, created_at, updated_at) FROM stdin;
1	62	PRD-0008	3.00	2026-06-23 05:09:30.033+00	2026-06-23 05:09:30.033+00
2	62	PRD-2222	1.00	2026-06-25 12:57:19.139+00	2026-06-25 12:57:19.139+00
3	10	ppp-111	1.25	2026-06-25 13:00:21.18+00	2026-06-25 13:00:21.18+00
4	57	ppp-111	1.25	2026-06-25 13:01:05.6+00	2026-06-25 13:01:05.6+00
5	62	ppp-111	1.25	2026-06-25 13:09:30.103+00	2026-06-25 13:09:30.103+00
7	62	ppp-120	15.00	2026-06-28 23:09:54.996+00	2026-06-28 23:09:54.996+00
8	64	AAA-048	0.75	2026-06-30 01:39:08.962+00	2026-06-30 01:39:08.962+00
9	62	ppp	1.56	2026-07-02 15:39:39.104+00	2026-07-02 15:39:39.104+00
10	58	PRD-MOUSE	10.00	2026-07-02 16:09:59.85+00	2026-07-02 16:09:59.85+00
11	61	PRD-0004	80.00	2026-07-07 16:39:00.095+00	2026-07-07 16:39:00.095+00
12	60	PRD-0NaN	0.75	2026-07-07 16:40:16.313+00	2026-07-07 16:40:16.313+00
13	61	PRD-0006	650.00	2026-07-09 12:19:53.619+00	2026-07-09 12:19:53.619+00
14	54	PRD-0006	650.00	2026-07-09 12:53:21.792+00	2026-07-09 12:53:21.792+00
15	14	PRD-0006	650.00	2026-07-09 12:57:51.247+00	2026-07-09 12:57:51.247+00
16	59	PRD-0006	100.00	2026-07-15 04:31:02.782+00	2026-07-16 02:35:46.907+00
32	64	PRD-0006	1500.00	2026-07-17 05:37:15.917+00	2026-07-17 05:37:15.917+00
28	64	EJ-001	15.50	2026-07-17 05:16:46.95+00	2026-07-17 13:04:43.529+00
31	64	EJ-002	25.00	2026-07-17 05:36:31.119+00	2026-07-17 13:04:44.004+00
6	58	PRD-0005	160.00	2026-06-25 13:10:09.319+00	2026-07-17 16:14:29.532+00
17	59	PRD-0009	123.00	2026-07-15 15:49:35.68+00	2026-07-17 16:52:50.647+00
\.


--
-- Data for Name: detalle_factura_compra; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.detalle_factura_compra (id, factura_id, producto_id, producto_nombre, producto_codigo, cantidad, pvp, graba_iva, porcentaje_iva, subtotal, valor_iva, total_linea, created_at, updated_at) FROM stdin;
3	7	0	Leche en Polvo La Lechera 500gr	PRD-0008	1.0000	3.00	t	15.00	3.00	0.45	3.45	2026-06-23 05:21:07.964+00	2026-06-23 05:21:07.964+00
4	8	0	Leche en Polvo La Lechera 500gr	PRD-0008	1.0000	3.00	t	15.00	3.00	0.45	3.45	2026-06-23 05:24:52.165+00	2026-06-23 05:24:52.165+00
5	9	0	leche	ppp-111	2.0000	3.12	t	15.00	6.24	0.94	7.18	2026-06-24 23:18:09.517+00	2026-06-24 23:18:09.517+00
6	10	0	leche	ppp-111	10.0000	1.25	t	15.00	12.50	1.88	14.38	2026-06-25 13:01:23.819+00	2026-06-25 13:01:23.819+00
7	11	0	leche	ppp-111	5.0000	1.25	t	15.00	6.25	0.94	7.19	2026-06-25 13:09:43.381+00	2026-06-25 13:09:43.381+00
8	11	0	Leche en Polvo La Lechera 500gr	PRD-0008	1.0000	3.00	t	15.00	3.00	0.45	3.45	2026-06-25 13:09:43.466+00	2026-06-25 13:09:43.466+00
9	12	0	Monitor Samsung 24 pulgadas	PRD-0005	22.0000	160.00	t	15.00	3520.00	528.00	4048.00	2026-06-25 13:10:18.209+00	2026-06-25 13:10:18.209+00
10	13	0	Salsa de Soya	PRD-2222	1.0000	1.00	t	15.00	1.00	0.15	1.15	2026-06-25 13:36:04.049+00	2026-06-25 13:36:04.049+00
11	14	0	GRAVA	ppp-120	1.0000	15.00	t	15.00	15.00	2.25	17.25	2026-06-28 23:09:58.643+00	2026-06-28 23:09:58.643+00
12	15	0	GRAVA	ppp-120	8.0000	15.00	t	15.00	120.00	18.00	138.00	2026-07-02 16:18:40.321+00	2026-07-02 16:18:40.321+00
13	16	0	Mouse Corsair	PRD-MOUSE	6.0000	10.00	t	15.00	60.00	9.00	69.00	2026-07-02 16:19:08.711+00	2026-07-02 16:19:08.711+00
14	17	0	Leche en Polvo La Lechera 500gr	PRD-0008	1.0000	3.00	t	15.00	3.00	0.45	3.45	2026-07-02 16:19:57.884+00	2026-07-02 16:19:57.884+00
15	18	0	Pasta	AAA-048	6.0000	0.75	t	15.00	4.50	0.67	5.18	2026-07-02 16:20:29.714+00	2026-07-02 16:20:29.714+00
16	19	0	Salsa de Soya	PRD-2222	9.0000	1.00	t	15.00	9.00	1.35	10.35	2026-07-02 17:46:52.861+00	2026-07-02 17:46:52.861+00
17	20	0	soya	ppp	1.0000	1.56	t	15.00	1.56	0.23	1.79	2026-07-02 18:05:51.486+00	2026-07-02 18:05:51.486+00
18	20	0	GRAVA	ppp-120	1.0000	15.00	t	15.00	15.00	2.25	17.25	2026-07-02 18:05:51.743+00	2026-07-02 18:05:51.743+00
19	21	0	GRAVA	ppp-120	2.0000	15.00	t	15.00	30.00	4.50	34.50	2026-07-02 18:08:42.182+00	2026-07-02 18:08:42.182+00
20	22	0	Teclado Mecánico RGB	PRD-0004	1.0000	80.00	t	15.00	80.00	12.00	92.00	2026-07-06 13:14:10.214+00	2026-07-06 13:14:10.214+00
21	23	0	soya	ppp	2.0000	1.56	t	15.00	3.12	0.47	3.59	2026-07-06 14:47:00.397+00	2026-07-06 14:47:00.397+00
22	24	0	leche	ppp-111	1.0000	1.25	t	15.00	1.25	0.19	1.44	2026-07-06 14:51:16.097+00	2026-07-06 14:51:16.097+00
23	25	0	soya	ppp	1.0000	1.56	t	15.00	1.56	0.23	1.79	2026-07-07 12:15:37.794+00	2026-07-07 12:15:37.794+00
24	26	0	soya	ppp	1.0000	1.56	t	15.00	1.56	0.23	1.79	2026-07-07 12:15:44.733+00	2026-07-07 12:15:44.733+00
25	27	0	Teclado Mecánico RGB	PRD-0004	1.0000	80.00	t	15.00	80.00	12.00	92.00	2026-07-07 15:07:28.986+00	2026-07-07 15:07:28.986+00
26	28	0	Teclado Mecánico RGB	PRD-0004	3.0000	80.00	t	15.00	240.00	36.00	276.00	2026-07-07 16:39:19.631+00	2026-07-07 16:39:19.631+00
27	29	0	Atún Real 200gr	PRD-0NaN	23.0000	0.75	t	15.00	17.25	2.59	19.84	2026-07-07 16:41:32.829+00	2026-07-07 16:41:32.829+00
28	30	0	Atún Real 200gr	PRD-0NaN	1.0000	0.75	t	15.00	0.75	0.11	0.86	2026-07-07 16:44:55.14+00	2026-07-07 16:44:55.14+00
29	31	0	Televisión TCL 65"	PRD-0006	3.0000	650.00	t	15.00	1950.00	292.50	2242.50	2026-07-09 12:20:19.839+00	2026-07-09 12:20:19.839+00
30	32	0	Pasta	AAA-048	10.0000	0.75	t	15.00	7.50	1.13	8.63	2026-07-09 12:39:55.653+00	2026-07-09 12:39:55.653+00
31	33	0	Teclado Mecánico RGB	PRD-0004	4.0000	80.00	t	15.00	320.00	48.00	368.00	2026-07-09 12:43:00.939+00	2026-07-09 12:43:00.939+00
32	34	0	Mouse Corsair	PRD-MOUSE	1.0000	10.00	t	15.00	10.00	1.50	11.50	2026-07-09 12:47:18.218+00	2026-07-09 12:47:18.218+00
33	34	0	Monitor Samsung 24 pulgadas	PRD-0005	1.0000	160.00	t	15.00	160.00	24.00	184.00	2026-07-09 12:47:18.408+00	2026-07-09 12:47:18.408+00
34	35	0	soya	ppp	1.0000	1.56	t	15.00	1.56	0.23	1.79	2026-07-14 02:13:00.417+00	2026-07-14 02:13:00.417+00
35	36	0	Pasta	AAA-048	10.0000	0.75	t	15.00	7.50	1.13	8.63	2026-07-14 02:59:51.863+00	2026-07-14 02:59:51.863+00
36	37	0	GRAVA	ppp-120	1.0000	15.00	t	15.00	15.00	2.25	17.25	2026-07-14 03:10:25.192+00	2026-07-14 03:10:25.192+00
50	48	0	Producto desconocido	ppp-120	10.0000	15.00	t	15.00	150.00	22.50	172.50	2026-07-14 17:42:32.365+00	2026-07-14 17:42:32.365+00
51	48	0	Producto desconocido	ppp-111	3.0000	1.25	t	15.00	3.75	0.56	4.31	2026-07-14 17:42:32.614+00	2026-07-14 17:42:32.614+00
52	48	0	Producto desconocido	PRD-2222	7.0000	1.00	t	15.00	7.00	1.05	8.05	2026-07-14 17:42:32.819+00	2026-07-14 17:42:32.819+00
54	50	0	Laptop HP	PRD-0009	1.0000	123.00	t	15.00	123.00	18.45	141.45	2026-07-15 03:54:22.196+00	2026-07-15 03:54:22.196+00
55	51	0	Laptop HP	PRD-0009	2.0000	123.00	t	15.00	246.00	36.90	282.90	2026-07-15 03:56:45.204+00	2026-07-15 03:56:45.204+00
56	52	0	Laptop HP	PRD-0009	3.0000	123.00	t	15.00	369.00	55.35	424.35	2026-07-15 04:07:31.747+00	2026-07-15 04:07:31.747+00
57	53	0	Laptop HP	PRD-0009	1.0000	123.00	t	15.00	123.00	18.45	141.45	2026-07-15 04:11:32.551+00	2026-07-15 04:11:32.551+00
58	54	0	Laptop HP	PRD-0009	1.0000	123.00	t	15.00	123.00	18.45	141.45	2026-07-15 04:20:22.193+00	2026-07-15 04:20:22.193+00
59	55	0	Televisión TCL 65"	PRD-0006	1.0000	100.00	t	15.00	100.00	15.00	115.00	2026-07-15 04:31:02.611+00	2026-07-15 04:31:02.611+00
60	56	0	Laptop HP	PRD-0009	1.0000	123.00	t	15.00	123.00	18.45	141.45	2026-07-15 15:49:35.42+00	2026-07-15 15:49:35.42+00
61	57	0	Monitor Samsung 24 pulgadas	PRD-0005	1.0000	160.00	t	15.00	160.00	24.00	184.00	2026-07-15 16:20:05.259+00	2026-07-15 16:20:05.259+00
62	58	0	Laptop HP	PRD-0009	2.0000	123.00	t	15.00	246.00	36.90	282.90	2026-07-15 17:41:15.591+00	2026-07-15 17:41:15.591+00
63	58	0	Televisión TCL 65"	PRD-0006	1.0000	100.00	t	15.00	100.00	15.00	115.00	2026-07-15 17:41:15.804+00	2026-07-15 17:41:15.804+00
64	59	0	Laptop HP	PRD-0009	4.0000	123.00	t	15.00	492.00	73.80	565.80	2026-07-15 17:44:50.982+00	2026-07-15 17:44:50.982+00
65	59	0	Televisión TCL 65"	PRD-0006	4.0000	100.00	t	15.00	400.00	60.00	460.00	2026-07-15 17:44:51.17+00	2026-07-15 17:44:51.17+00
66	60	0	Laptop HP	PRD-0009	1.0000	123.00	t	15.00	123.00	18.45	141.45	2026-07-15 17:46:42.328+00	2026-07-15 17:46:42.328+00
67	63	0	Televisión TCL 65"	PRD-0006	1.0000	100.00	t	15.00	100.00	15.00	115.00	2026-07-16 02:26:58.189+00	2026-07-16 02:26:58.189+00
68	64	0	Laptop HP	PRD-0009	1.0000	123.00	t	15.00	123.00	18.45	141.45	2026-07-16 02:28:30.066+00	2026-07-16 02:28:30.066+00
69	65	0	Laptop HP	PRD-0009	1.0000	123.00	t	15.00	123.00	18.45	141.45	2026-07-16 02:29:42.356+00	2026-07-16 02:29:42.356+00
70	66	0	Televisión TCL 65"	PRD-0006	1.0000	100.00	t	15.00	100.00	15.00	115.00	2026-07-16 02:35:46.732+00	2026-07-16 02:35:46.732+00
71	67	0	Laptop HP	PRD-0009	2.0000	123.00	t	15.00	246.00	36.90	282.90	2026-07-17 05:23:25.275+00	2026-07-17 05:23:25.275+00
72	68	0	Monitor Samsung 24 pulgadas	PRD-0005	4.0000	160.00	t	15.00	640.00	96.00	736.00	2026-07-17 16:08:29.774+00	2026-07-17 16:08:29.774+00
73	69	0	Monitor Samsung 24 pulgadas	PRD-0005	1.0000	160.00	t	15.00	160.00	24.00	184.00	2026-07-17 16:14:29.347+00	2026-07-17 16:14:29.347+00
74	70	0	Laptop HP	PRD-0009	1.0000	123.00	t	15.00	123.00	18.45	141.45	2026-07-17 16:52:50.44+00	2026-07-17 16:52:50.44+00
\.


--
-- Data for Name: facturas_compra; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.facturas_compra (id, numero_factura, numero_factura_proveedor, fecha, proveedor_id, tipo_pago, fecha_vencimiento, subtotal_sin_iva, subtotal_con_iva, total_iva, total, estado, pdf_generado, pdf_url, observaciones, created_by, updated_by, created_at, updated_at) FROM stdin;
1	FC-00000008	PROV-001	2026-06-15	10	CONTADO	\N	0.00	0.00	0.00	0.00	BORRADOR	f	\N	Prueba HU2	1	\N	2026-06-15 22:43:57.434+00	2026-06-15 22:43:57.434+00
2	FC-00000009	\N	2026-06-15	10	CREDITO	2026-07-15	0.00	0.00	0.00	0.00	BORRADOR	f	\N	\N	1	\N	2026-06-15 22:44:45.042+00	2026-06-15 22:44:45.042+00
3	FC-00000010	PROV-001	2026-06-15	10	CONTADO	\N	0.00	0.00	0.00	0.00	BORRADOR	f	\N	Prueba HU2	1	\N	2026-06-16 03:46:24.744+00	2026-06-16 03:46:24.744+00
4	FC-00000011	PROV-001	2026-06-15	10	CONTADO	\N	0.00	0.00	0.00	0.00	BORRADOR	f	\N	Prueba HU2	1	\N	2026-06-16 17:02:15.893+00	2026-06-16 17:02:15.893+00
65	FC-00000072	\N	2026-07-16	59	CREDITO	2026-07-16	0.00	123.00	18.45	141.45	EMITIDA	t	\N	\N	1	\N	2026-07-16 02:29:42.274+00	2026-07-16 02:29:42.231162+00
7	FC-00000014	\N	2026-06-23	62	CONTADO	\N	0.00	3.00	0.45	3.45	EMITIDA	t	\N	\N	1	\N	2026-06-23 05:21:07.755+00	2026-06-23 05:21:09.098221+00
50	FC-00000057	\N	2026-07-15	58	CONTADO	\N	0.00	123.00	18.45	141.45	EMITIDA	t	\N	\N	1	\N	2026-07-15 03:54:21.999+00	2026-07-15 03:54:17.060437+00
26	FC-00000033	\N	2026-07-07	62	CONTADO	\N	0.00	1.56	0.23	1.79	EMITIDA	t	\N	\N	1	\N	2026-07-07 12:15:44.53+00	2026-07-07 12:15:45.185091+00
8	FC-00000015	\N	2026-06-23	62	CONTADO	\N	0.00	3.00	0.45	3.45	EMITIDA	t	\N	\N	1	\N	2026-06-23 05:24:51.966+00	2026-06-23 05:24:53.274148+00
58	FC-00000065	\N	2026-07-15	59	CONTADO	\N	0.00	346.00	51.90	397.90	EMITIDA	t	\N	\N	1	\N	2026-07-15 17:41:15.483+00	2026-07-15 17:41:15.442943+00
9	FC-00000016	\N	2026-06-24	27	CONTADO	\N	0.00	6.24	0.94	7.18	EMITIDA	t	\N	\N	1	\N	2026-06-24 23:18:09.322+00	2026-06-24 23:18:16.959502+00
51	FC-00000058	\N	2026-07-15	59	CREDITO	2026-07-15	0.00	246.00	36.90	282.90	EMITIDA	t	\N	\N	1	\N	2026-07-15 03:56:45.046+00	2026-07-15 03:56:40.134035+00
10	FC-00000017	\N	2026-06-25	57	CONTADO	\N	0.00	12.50	1.88	14.38	EMITIDA	t	\N	\N	1	\N	2026-06-25 13:01:23.625+00	2026-06-25 13:01:23.543398+00
27	FC-00000034	\N	2026-07-07	59	CONTADO	\N	0.00	80.00	12.00	92.00	EMITIDA	t	\N	\N	1	\N	2026-07-07 15:07:28.876+00	2026-07-07 15:07:28.83181+00
52	FC-00000059	\N	2026-07-15	58	CONTADO	\N	0.00	369.00	55.35	424.35	EMITIDA	t	\N	\N	1	\N	2026-07-15 04:07:31.407+00	2026-07-15 04:07:26.483767+00
11	FC-00000018	\N	2026-06-25	62	CONTADO	\N	0.00	9.25	1.39	10.64	EMITIDA	t	\N	\N	1	\N	2026-06-25 13:09:43.309+00	2026-06-25 13:09:43.265416+00
69	FC-00000076	\N	2026-07-17	58	CREDITO	2026-07-25	0.00	160.00	24.00	184.00	EMITIDA	t	\N	\N	1	\N	2026-07-17 16:14:29.172+00	2026-07-17 16:14:29.311592+00
12	FC-00000019	\N	2026-06-25	58	CONTADO	\N	0.00	3520.00	528.00	4048.00	EMITIDA	t	\N	\N	1	\N	2026-06-25 13:10:18.137+00	2026-06-25 13:10:18.098389+00
53	FC-00000060	\N	2026-07-15	58	CONTADO	\N	0.00	123.00	18.45	141.45	EMITIDA	t	\N	\N	1	\N	2026-07-15 04:11:32.283+00	2026-07-15 04:11:27.387974+00
28	FC-00000035	\N	2026-07-07	61	CONTADO	\N	0.00	240.00	36.00	276.00	EMITIDA	t	\N	\N	1	\N	2026-07-07 16:39:19.245+00	2026-07-07 16:39:14.703976+00
13	FC-00000020	\N	2026-06-25	62	CONTADO	\N	0.00	1.00	0.15	1.15	EMITIDA	t	\N	\N	1	\N	2026-06-25 13:36:03.972+00	2026-06-25 13:36:03.929405+00
66	FC-00000073	\N	2026-07-16	59	CREDITO	2026-07-16	0.00	100.00	15.00	115.00	EMITIDA	t	\N	\N	1	\N	2026-07-16 02:35:46.575+00	2026-07-16 02:35:44.759613+00
14	FC-00000021	\N	2026-06-28	62	CONTADO	\N	0.00	15.00	2.25	17.25	EMITIDA	t	\N	\N	1	\N	2026-06-28 23:09:58.483+00	2026-06-28 23:09:59.967166+00
54	FC-00000061	\N	2026-07-15	58	CONTADO	\N	0.00	123.00	18.45	141.45	EMITIDA	t	\N	\N	1	\N	2026-07-15 04:20:22+00	2026-07-15 04:20:17.067158+00
15	FC-00000022	\N	2026-07-02	62	CONTADO	\N	0.00	120.00	18.00	138.00	EMITIDA	t	\N	\N	1	\N	2026-07-02 16:18:40.246+00	2026-07-02 16:18:40.199163+00
59	FC-00000066	\N	2026-07-15	59	CONTADO	\N	0.00	892.00	133.80	1025.80	EMITIDA	t	\N	\N	1	\N	2026-07-15 17:44:50.892+00	2026-07-15 17:44:50.852275+00
29	FC-00000036	\N	2026-07-07	60	CONTADO	\N	0.00	17.25	2.59	19.84	EMITIDA	t	\N	\N	1	\N	2026-07-07 16:41:32.392+00	2026-07-07 16:41:24.756402+00
16	FC-00000023	\N	2026-07-02	58	CONTADO	\N	0.00	60.00	9.00	69.00	EMITIDA	t	\N	\N	1	\N	2026-07-02 16:19:08.636+00	2026-07-02 16:19:08.591332+00
55	FC-00000062	\N	2026-07-15	59	CONTADO	\N	0.00	100.00	15.00	115.00	EMITIDA	t	\N	\N	1	\N	2026-07-15 04:31:02.456+00	2026-07-15 04:30:57.580737+00
17	FC-00000024	\N	2026-07-02	62	CONTADO	\N	0.00	3.00	0.45	3.45	EMITIDA	t	\N	\N	1	\N	2026-07-02 16:19:57.814+00	2026-07-02 16:19:57.768991+00
56	FC-00000063	\N	2026-07-15	59	CONTADO	\N	0.00	123.00	18.45	141.45	EMITIDA	t	\N	\N	1	\N	2026-07-15 15:49:35.21+00	2026-07-15 15:49:35.28284+00
18	FC-00000025	\N	2026-07-02	64	CONTADO	\N	0.00	4.50	0.67	5.18	EMITIDA	t	\N	\N	1	\N	2026-07-02 16:20:29.513+00	2026-07-02 16:20:29.434553+00
30	FC-00000037	\N	2026-07-07	60	CONTADO	\N	0.00	0.75	0.11	0.86	EMITIDA	t	\N	\N	1	\N	2026-07-07 16:44:54.91+00	2026-07-07 16:44:54.86408+00
19	FC-00000026	\N	2026-07-02	62	CONTADO	\N	0.00	9.00	1.35	10.35	EMITIDA	t	\N	\N	1	\N	2026-07-02 17:46:52.691+00	2026-07-02 17:46:50.538008+00
57	FC-00000064	\N	2026-07-15	58	CONTADO	\N	0.00	160.00	24.00	184.00	EMITIDA	t	\N	\N	1	\N	2026-07-15 16:20:05.169+00	2026-07-15 16:20:05.125871+00
20	FC-00000027	\N	2026-07-02	62	CONTADO	\N	0.00	16.56	2.48	19.04	EMITIDA	t	\N	\N	1	\N	2026-07-02 18:05:51.283+00	2026-07-02 18:05:49.037594+00
60	FC-00000067	\N	2026-07-15	59	CREDITO	2026-07-15	0.00	123.00	18.45	141.45	EMITIDA	t	\N	\N	1	\N	2026-07-15 17:46:42.245+00	2026-07-15 17:46:42.20368+00
31	FC-00000038	\N	2026-07-09	61	CONTADO	\N	0.00	1950.00	292.50	2242.50	EMITIDA	t	\N	\N	1	\N	2026-07-09 12:20:19.648+00	2026-07-09 12:20:19.430033+00
21	FC-00000028	\N	2026-07-02	62	CONTADO	\N	0.00	30.00	4.50	34.50	EMITIDA	t	\N	\N	1	\N	2026-07-02 18:08:41.92+00	2026-07-02 18:08:39.587394+00
22	FC-00000029	\N	2026-07-06	62	CONTADO	\N	0.00	80.00	12.00	92.00	EMITIDA	t	\N	\N	1	\N	2026-07-06 13:14:10.121+00	2026-07-06 13:14:10.076226+00
63	FC-00000070	\N	2026-07-16	59	CREDITO	2026-07-16	0.00	100.00	15.00	115.00	EMITIDA	t	\N	\N	1	\N	2026-07-16 02:26:58.029+00	2026-07-16 02:26:56.211354+00
23	FC-00000030	\N	2026-07-06	62	CONTADO	\N	0.00	3.12	0.47	3.59	EMITIDA	t	\N	\N	1	\N	2026-07-06 14:47:00.203+00	2026-07-06 14:47:01.392518+00
67	FC-00000074	\N	2026-07-17	59	CONTADO	\N	0.00	246.00	36.90	282.90	EMITIDA	t	\N	\N	1	\N	2026-07-17 05:23:25.091+00	2026-07-17 05:23:25.515401+00
32	FC-00000039	\N	2026-07-09	64	CONTADO	\N	0.00	7.50	1.13	8.63	EMITIDA	t	\N	\N	1	\N	2026-07-09 12:39:55.427+00	2026-07-09 12:39:55.21632+00
24	FC-00000031	\N	2026-07-06	62	CONTADO	\N	0.00	1.25	0.19	1.44	EMITIDA	t	\N	\N	1	\N	2026-07-06 14:51:15.9+00	2026-07-06 14:51:17.101472+00
64	FC-00000071	\N	2026-07-16	59	CREDITO	2026-07-16	0.00	123.00	18.45	141.45	EMITIDA	t	\N	\N	1	\N	2026-07-16 02:28:29.911+00	2026-07-16 02:28:28.0944+00
25	FC-00000032	\N	2026-07-07	62	CONTADO	\N	0.00	1.56	0.23	1.79	EMITIDA	t	\N	\N	1	\N	2026-07-07 12:15:37.587+00	2026-07-07 12:15:38.266251+00
33	FC-00000040	\N	2026-07-09	61	CONTADO	\N	0.00	320.00	48.00	368.00	EMITIDA	t	\N	\N	1	\N	2026-07-09 12:43:00.75+00	2026-07-09 12:43:00.542438+00
70	FC-00000077	\N	2026-07-17	59	CREDITO	2026-07-31	0.00	123.00	18.45	141.45	EMITIDA	t	\N	\N	1	\N	2026-07-17 16:52:50.261+00	2026-07-17 16:52:50.44874+00
68	FC-00000075	\N	2026-07-17	58	CONTADO	\N	0.00	640.00	96.00	736.00	EMITIDA	t	\N	\N	1	\N	2026-07-17 16:08:29.594+00	2026-07-17 16:08:29.720418+00
34	FC-00000041	\N	2026-07-09	58	CONTADO	\N	0.00	170.00	25.50	195.50	EMITIDA	t	\N	\N	1	\N	2026-07-09 12:47:18.03+00	2026-07-09 12:47:17.818012+00
35	FC-00000042	\N	2026-07-14	62	CONTADO	\N	0.00	1.56	0.23	1.79	EMITIDA	t	\N	\N	1	\N	2026-07-14 02:13:00.236+00	2026-07-14 02:12:57.628338+00
36	FC-00000043	\N	2026-07-14	64	CONTADO	\N	0.00	7.50	1.13	8.63	EMITIDA	t	\N	\N	1	\N	2026-07-14 02:59:51.673+00	2026-07-14 02:59:49.130223+00
37	FC-00000044	\N	2026-07-14	62	CONTADO	\N	0.00	15.00	2.25	17.25	EMITIDA	t	\N	\N	1	\N	2026-07-14 03:10:25.007+00	2026-07-14 03:10:22.470656+00
48	FC-00000055	\N	2026-07-14	62	CONTADO	\N	0.00	160.75	24.11	184.86	EMITIDA	t	\N	\N	1	\N	2026-07-14 17:42:32.153+00	2026-07-14 17:42:29.975573+00
\.


--
-- Data for Name: gastos_cxc; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gastos_cxc (id, cuenta_bancaria_id, monto, motivo, factura_id, saldo_credito_id, fecha_pago, sincronizado) FROM stdin;
12	df9bd17a-4c31-4e36-9485-a87968b5c9c4	115.00	Pago Cuota Saldo Proveedor #3	\N	3	2026-07-16 02:30:01.258+00	t
13	df9bd17a-4c31-4e36-9485-a87968b5c9c4	141.45	Pago Cuota Saldo Proveedor #4	\N	4	2026-07-16 02:30:21.004+00	t
14	66fc1303-18c3-48e6-9b69-fba06ad8f903	141.45	Pago Cuota Saldo Proveedor #5	\N	5	2026-07-16 02:37:50.765+00	t
15	66fc1303-18c3-48e6-9b69-fba06ad8f903	282.90	Pago Contado Factura Compra 67	67	\N	2026-07-17 05:23:25.654+00	t
16	df9bd17a-4c31-4e36-9485-a87968b5c9c4	115.00	Pago Cuota Saldo Proveedor #6	\N	6	2026-07-17 05:25:28.889+00	t
17	66fc1303-18c3-48e6-9b69-fba06ad8f903	736.00	Pago Contado Factura Compra 68	68	\N	2026-07-17 16:08:30.174+00	t
18	df9bd17a-4c31-4e36-9485-a87968b5c9c4	61.33	Pago Cuota Saldo Proveedor #7	\N	7	2026-07-17 16:15:26.021+00	t
19	df9bd17a-4c31-4e36-9485-a87968b5c9c4	61.33	Pago Cuota Saldo Proveedor #8	\N	8	2026-07-17 16:15:31.717+00	t
\.


--
-- Data for Name: pista_auditoria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pista_auditoria (id, fecha_hora, usuario_id, usuario_nombre, accion, modulo, tabla_afectada, registro_id, datos_anteriores, datos_nuevos, resultado, descripcion, ip_address, user_agent, created_at) FROM stdin;
1	2026-06-28 23:09:59.78+00	1	Admin	CREAR	COMPRAS	facturas_compra	14	\N	{"id": 14, "fecha": "2026-06-28T00:00:00.000Z", "total": "17.25", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "2.25", "created_at": "2026-06-28T23:09:58.483Z", "created_by": 1, "updated_at": "2026-06-28T23:09:59.967Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000021", "subtotal_con_iva": "15", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-06-28 23:09:59.78+00
2	2026-06-28 23:12:00.878+00	1	Administrador Sistema	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-28 23:12:00.878+00
3	2026-06-28 23:12:17.838+00	2	Auditor Sistema	LOGOUT	COMPRAS	usuarios	2	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-28 23:12:17.838+00
4	2026-06-28 23:12:36.921+00	2	Auditor Sistema	LOGOUT	COMPRAS	usuarios	2	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-28 23:12:36.921+00
5	2026-06-29 00:55:16.332+00	1	Administrador Sistema	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-29 00:55:16.332+00
6	2026-06-29 12:14:07.082+00	1	StevenCC	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-29 12:14:07.082+00
7	2026-06-30 01:26:53.479+00	2	Auditor Sistema	LOGOUT	COMPRAS	usuarios	2	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 01:26:53.479+00
8	2026-06-30 01:46:12.877+00	1	Administrador Sistema	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 01:46:12.877+00
9	2026-06-30 01:46:28.115+00	3	Comprador Usuario	LOGOUT	COMPRAS	usuarios	3	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 01:46:28.115+00
10	2026-06-30 01:48:55.621+00	3	Comprador Usuario	LOGOUT	COMPRAS	usuarios	3	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 01:48:55.621+00
11	2026-06-30 02:24:59.053+00	1	Administrador Sistema	IMPRIMIR	COMPRAS	proveedor	\N	\N	\N	EXITO	Generación de reporte PDF de proveedores	\N	\N	2026-06-30 02:24:59.053+00
12	2026-06-30 02:26:33.507+00	1	Administrador Sistema	IMPRIMIR	COMPRAS	proveedor	\N	\N	\N	EXITO	Generación de reporte PDF de proveedores	\N	\N	2026-06-30 02:26:33.507+00
13	2026-06-30 02:28:46.792+00	1	Administrador Sistema	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 02:28:46.792+00
14	2026-06-30 16:33:29.386+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:33:29.386+00
15	2026-06-30 16:33:30.882+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:33:30.882+00
16	2026-06-30 16:33:31.789+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:33:31.789+00
17	2026-06-30 16:33:32.245+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:33:32.245+00
18	2026-06-30 16:33:31.938+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:33:31.938+00
19	2026-06-30 16:33:32.094+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:33:32.094+00
20	2026-06-30 16:34:21.744+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:34:21.744+00
21	2026-06-30 16:34:38.542+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:34:38.542+00
22	2026-06-30 16:36:47.972+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:36:47.972+00
23	2026-06-30 16:36:49.372+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:36:49.372+00
24	2026-06-30 16:36:51.651+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:36:51.651+00
25	2026-06-30 16:38:21.36+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-06-30 16:38:21.36+00
26	2026-07-02 01:07:01.018+00	1	Administrador (Modo Prueba)	IMPRIMIR	COMPRAS	proveedor	\N	\N	\N	EXITO	Generación de reporte PDF de proveedores	\N	\N	2026-07-02 01:07:01.018+00
27	2026-07-02 15:44:55.473+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 15:44:55.473+00
28	2026-07-02 15:44:56.152+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 15:44:56.152+00
29	2026-07-02 15:46:13.896+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 15:46:13.896+00
30	2026-07-02 15:57:19.741+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 15:57:19.741+00
31	2026-07-02 15:59:06.02+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 15:59:06.02+00
32	2026-07-02 16:14:36.906+00	1	Administrador (Modo Prueba)	ELIMINAR	COMPRAS	proveedor	64	{"id": 64, "tipo": "CREDITO", "banco": null, "email": "correo@ejemplo.com", "ciudad": "Quito", "estado": "ACTIVO", "nombre": "Laura Shiji", "telefono": "0999316866", "cedulaRuc": "1050135788", "createdAt": "2026-06-28T22:59:59.108Z", "deletedAt": null, "direccion": "Simon Bolivar 15", "updatedAt": "2026-06-28T22:59:59.108Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	{"id": 64, "tipo": "CREDITO", "banco": null, "email": "correo@ejemplo.com", "ciudad": "Quito", "estado": "INACTIVO", "nombre": "Laura Shiji", "telefono": "0999316866", "cedulaRuc": "1050135788", "createdAt": "2026-06-28T22:59:59.108Z", "deletedAt": "2026-07-02T16:14:36.764Z", "direccion": "Simon Bolivar 15", "updatedAt": "2026-07-02T16:14:36.795Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	EXITO	Eliminación lógica de proveedor	\N	\N	2026-07-02 16:14:36.906+00
33	2026-07-02 16:18:41.07+00	1	Admin	CREAR	COMPRAS	facturas_compra	15	\N	{"id": 15, "fecha": "2026-07-02T00:00:00.000Z", "total": "138", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "18", "created_at": "2026-07-02T16:18:40.246Z", "created_by": 1, "updated_at": "2026-07-02T16:18:40.199Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000022", "subtotal_con_iva": "120", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-02 16:18:41.07+00
34	2026-07-02 16:19:09.419+00	1	Admin	CREAR	COMPRAS	facturas_compra	16	\N	{"id": 16, "fecha": "2026-07-02T00:00:00.000Z", "total": "69", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "9", "created_at": "2026-07-02T16:19:08.636Z", "created_by": 1, "updated_at": "2026-07-02T16:19:08.591Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 58, "observaciones": null, "numero_factura": "FC-00000023", "subtotal_con_iva": "60", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-02 16:19:09.419+00
35	2026-07-02 16:19:58.594+00	1	Admin	CREAR	COMPRAS	facturas_compra	17	\N	{"id": 17, "fecha": "2026-07-02T00:00:00.000Z", "total": "3.45", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "0.45", "created_at": "2026-07-02T16:19:57.814Z", "created_by": 1, "updated_at": "2026-07-02T16:19:57.768Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000024", "subtotal_con_iva": "3", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-02 16:19:58.594+00
36	2026-07-02 16:20:30.644+00	1	Admin	CREAR	COMPRAS	facturas_compra	18	\N	{"id": 18, "fecha": "2026-07-02T00:00:00.000Z", "total": "5.18", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "0.67", "created_at": "2026-07-02T16:20:29.513Z", "created_by": 1, "updated_at": "2026-07-02T16:20:29.434Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 64, "observaciones": null, "numero_factura": "FC-00000025", "subtotal_con_iva": "4.5", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-02 16:20:30.644+00
37	2026-07-02 17:38:46.501+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 17:38:46.501+00
38	2026-07-02 17:38:46.497+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 17:38:46.497+00
39	2026-07-02 17:38:54.641+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 17:38:54.641+00
40	2026-07-02 17:38:54.8+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 17:38:54.8+00
41	2026-07-02 17:38:56.417+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 17:38:56.417+00
42	2026-07-02 17:38:56.417+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 17:38:56.417+00
43	2026-07-02 17:44:57.086+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 17:44:57.086+00
44	2026-07-02 17:44:57.877+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 17:44:57.877+00
45	2026-07-02 17:46:53.887+00	1	Admin	CREAR	COMPRAS	facturas_compra	19	\N	{"id": 19, "fecha": "2026-07-02T00:00:00.000Z", "total": "10.35", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "1.35", "created_at": "2026-07-02T17:46:52.691Z", "created_by": 1, "updated_at": "2026-07-02T17:46:50.538Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000026", "subtotal_con_iva": "9", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-02 17:46:53.887+00
46	2026-07-02 18:05:52.736+00	1	Admin	CREAR	COMPRAS	facturas_compra	20	\N	{"id": 20, "fecha": "2026-07-02T00:00:00.000Z", "total": "19.04", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "2.48", "created_at": "2026-07-02T18:05:51.283Z", "created_by": 1, "updated_at": "2026-07-02T18:05:49.037Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000027", "subtotal_con_iva": "16.56", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-02 18:05:52.736+00
47	2026-07-02 18:08:43.392+00	1	Admin	CREAR	COMPRAS	facturas_compra	21	\N	{"id": 21, "fecha": "2026-07-02T00:00:00.000Z", "total": "34.5", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "4.5", "created_at": "2026-07-02T18:08:41.920Z", "created_by": 1, "updated_at": "2026-07-02T18:08:39.587Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000028", "subtotal_con_iva": "30", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-02 18:08:43.392+00
48	2026-07-02 18:20:35.858+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 18:20:35.858+00
49	2026-07-02 18:20:45.765+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 18:20:45.765+00
50	2026-07-02 18:28:30.669+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 18:28:30.669+00
51	2026-07-02 18:29:16.546+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-02 18:29:16.546+00
52	2026-07-06 13:14:10.997+00	1	Admin	CREAR	COMPRAS	facturas_compra	22	\N	{"id": 22, "fecha": "2026-07-06T00:00:00.000Z", "total": "92", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "12", "created_at": "2026-07-06T13:14:10.121Z", "created_by": 1, "updated_at": "2026-07-06T13:14:10.076Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000029", "subtotal_con_iva": "80", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-06 13:14:10.997+00
53	2026-07-06 14:47:01.467+00	1	Admin	CREAR	COMPRAS	facturas_compra	23	\N	{"id": 23, "fecha": "2026-07-06T00:00:00.000Z", "total": "3.59", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "0.47", "created_at": "2026-07-06T14:47:00.203Z", "created_by": 1, "updated_at": "2026-07-06T14:47:01.392Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000030", "subtotal_con_iva": "3.12", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-06 14:47:01.467+00
54	2026-07-06 14:51:17.168+00	1	Admin	CREAR	COMPRAS	facturas_compra	24	\N	{"id": 24, "fecha": "2026-07-06T00:00:00.000Z", "total": "1.44", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "0.19", "created_at": "2026-07-06T14:51:15.900Z", "created_by": 1, "updated_at": "2026-07-06T14:51:17.101Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000031", "subtotal_con_iva": "1.25", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-06 14:51:17.168+00
55	2026-07-06 16:07:02.647+00	1	Administrador (Modo Prueba)	LOGOUT	COMPRAS	usuarios	1	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-06 16:07:02.647+00
56	2026-07-07 12:15:39.12+00	1	Admin	CREAR	COMPRAS	facturas_compra	25	\N	{"id": 25, "fecha": "2026-07-07T00:00:00.000Z", "total": "1.79", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "0.23", "created_at": "2026-07-07T12:15:37.587Z", "created_by": 1, "updated_at": "2026-07-07T12:15:38.266Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000032", "subtotal_con_iva": "1.56", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-07 12:15:39.12+00
57	2026-07-07 12:15:46.121+00	1	Admin	CREAR	COMPRAS	facturas_compra	26	\N	{"id": 26, "fecha": "2026-07-07T00:00:00.000Z", "total": "1.79", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "0.23", "created_at": "2026-07-07T12:15:44.530Z", "created_by": 1, "updated_at": "2026-07-07T12:15:45.185Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000033", "subtotal_con_iva": "1.56", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-07 12:15:46.121+00
58	2026-07-07 15:07:29.78+00	1	Admin	CREAR	COMPRAS	facturas_compra	27	\N	{"id": 27, "fecha": "2026-07-07T00:00:00.000Z", "total": "92", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "12", "created_at": "2026-07-07T15:07:28.876Z", "created_by": 1, "updated_at": "2026-07-07T15:07:28.831Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000034", "subtotal_con_iva": "80", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-07 15:07:29.78+00
59	2026-07-07 15:53:55.775+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 15:53:55.775+00
60	2026-07-07 15:53:56.176+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 15:53:56.176+00
61	2026-07-07 15:53:56.071+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 15:53:56.071+00
62	2026-07-07 15:53:57.371+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 15:53:57.371+00
63	2026-07-07 15:53:57.679+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 15:53:57.679+00
64	2026-07-07 15:53:57.974+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 15:53:57.974+00
65	2026-07-07 15:53:56.371+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 15:53:56.371+00
66	2026-07-07 15:54:11.865+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 15:54:11.865+00
67	2026-07-07 16:22:50.549+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 16:22:50.549+00
68	2026-07-07 16:24:21.256+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 16:24:21.256+00
69	2026-07-07 16:26:35.79+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 16:26:35.79+00
70	2026-07-07 16:39:21.23+00	1	Admin	CREAR	COMPRAS	facturas_compra	28	\N	{"id": 28, "fecha": "2026-07-07T00:00:00.000Z", "total": "276", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "36", "created_at": "2026-07-07T16:39:19.245Z", "created_by": 1, "updated_at": "2026-07-07T16:39:14.703Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 61, "observaciones": null, "numero_factura": "FC-00000035", "subtotal_con_iva": "240", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-07 16:39:21.23+00
71	2026-07-07 16:41:34.613+00	1	Admin	CREAR	COMPRAS	facturas_compra	29	\N	{"id": 29, "fecha": "2026-07-07T00:00:00.000Z", "total": "19.84", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "2.59", "created_at": "2026-07-07T16:41:32.392Z", "created_by": 1, "updated_at": "2026-07-07T16:41:24.756Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 60, "observaciones": null, "numero_factura": "FC-00000036", "subtotal_con_iva": "17.25", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-07 16:41:34.613+00
72	2026-07-07 16:44:56.682+00	1	Admin	CREAR	COMPRAS	facturas_compra	30	\N	{"id": 30, "fecha": "2026-07-07T00:00:00.000Z", "total": "0.86", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "0.11", "created_at": "2026-07-07T16:44:54.910Z", "created_by": 1, "updated_at": "2026-07-07T16:44:54.864Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 60, "observaciones": null, "numero_factura": "FC-00000037", "subtotal_con_iva": "0.75", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-07 16:44:56.682+00
73	2026-07-07 16:46:16.684+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-07 16:46:16.684+00
74	2026-07-07 17:03:26.548+00	9	LopezDario	ELIMINAR	COMPRAS	proveedor	63	{"id": 63, "tipo": "CREDITO", "banco": null, "email": "longraft22@gmail.com", "ciudad": "Ibarra", "estado": "ACTIVO", "nombre": "Jairo Farinango", "telefono": "0999316865", "cedulaRuc": "1050135787", "createdAt": "2026-06-23T15:22:39.389Z", "deletedAt": null, "direccion": "Ibarra, Imbabura", "updatedAt": "2026-06-23T15:22:39.389Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	{"id": 63, "tipo": "CREDITO", "banco": null, "email": "longraft22@gmail.com", "ciudad": "Ibarra", "estado": "INACTIVO", "nombre": "Jairo Farinango", "telefono": "0999316865", "cedulaRuc": "1050135787", "createdAt": "2026-06-23T15:22:39.389Z", "deletedAt": "2026-07-07T17:03:26.295Z", "direccion": "Ibarra, Imbabura", "updatedAt": "2026-07-07T17:03:26.452Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	EXITO	Eliminación lógica de proveedor	\N	\N	2026-07-07 17:03:26.548+00
75	2026-07-07 17:33:38.394+00	9	LopezDario	ELIMINAR	COMPRAS	proveedor	44	{"id": 44, "tipo": "CREDITO", "banco": null, "email": "ventas41@distribuidora.com", "ciudad": "Ibarra", "estado": "ACTIVO", "nombre": "DISTRIBUIDORA PQR CIA LTDA", "telefono": "0980000041", "cedulaRuc": "1003790041", "createdAt": "2026-06-15T22:26:37.743Z", "deletedAt": null, "direccion": "Avenida Principal 41", "updatedAt": "2026-06-15T22:26:37.743Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	{"id": 44, "tipo": "CREDITO", "banco": null, "email": "ventas41@distribuidora.com", "ciudad": "Ibarra", "estado": "INACTIVO", "nombre": "DISTRIBUIDORA PQR CIA LTDA", "telefono": "0980000041", "cedulaRuc": "1003790041", "createdAt": "2026-06-15T22:26:37.743Z", "deletedAt": "2026-07-07T17:33:38.062Z", "direccion": "Avenida Principal 41", "updatedAt": "2026-07-07T17:33:38.209Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	EXITO	Eliminación lógica de proveedor	\N	\N	2026-07-07 17:33:38.394+00
76	2026-07-09 12:20:21.006+00	1	Admin	CREAR	COMPRAS	facturas_compra	31	\N	{"id": 31, "fecha": "2026-07-09T00:00:00.000Z", "total": "2242.5", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "292.5", "created_at": "2026-07-09T12:20:19.648Z", "created_by": 1, "updated_at": "2026-07-09T12:20:19.430Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 61, "observaciones": null, "numero_factura": "FC-00000038", "subtotal_con_iva": "1950", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-09 12:20:21.006+00
77	2026-07-09 12:32:21.404+00	9	LopezDario	IMPRIMIR	COMPRAS	facturas_compra	\N	\N	\N	EXITO	Generación de reporte PDF de facturas	\N	\N	2026-07-09 12:32:21.404+00
78	2026-07-09 12:34:18.975+00	9	LopezDario	IMPRIMIR	COMPRAS	facturas_compra	\N	\N	\N	EXITO	Generación de reporte PDF de facturas	\N	\N	2026-07-09 12:34:18.975+00
79	2026-07-09 12:34:30.203+00	9	LopezDario	IMPRIMIR	COMPRAS	facturas_compra	\N	\N	\N	EXITO	Generación de reporte PDF de facturas	\N	\N	2026-07-09 12:34:30.203+00
80	2026-07-09 12:35:15.954+00	9	LopezDario	IMPRIMIR	COMPRAS	facturas_compra	\N	\N	\N	EXITO	Generación de reporte PDF de facturas	\N	\N	2026-07-09 12:35:15.954+00
81	2026-07-09 12:35:38.311+00	9	LopezDario	IMPRIMIR	COMPRAS	facturas_compra	\N	\N	\N	EXITO	Generación de reporte PDF de facturas	\N	\N	2026-07-09 12:35:38.311+00
82	2026-07-09 12:36:13.797+00	9	LopezDario	IMPRIMIR	COMPRAS	facturas_compra	\N	\N	\N	EXITO	Generación de reporte PDF de facturas	\N	\N	2026-07-09 12:36:13.797+00
83	2026-07-09 12:39:56.71+00	1	Admin	CREAR	COMPRAS	facturas_compra	32	\N	{"id": 32, "fecha": "2026-07-09T00:00:00.000Z", "total": "8.63", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "1.13", "created_at": "2026-07-09T12:39:55.427Z", "created_by": 1, "updated_at": "2026-07-09T12:39:55.216Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 64, "observaciones": null, "numero_factura": "FC-00000039", "subtotal_con_iva": "7.5", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-09 12:39:56.71+00
84	2026-07-09 12:43:02.004+00	1	Admin	CREAR	COMPRAS	facturas_compra	33	\N	{"id": 33, "fecha": "2026-07-09T00:00:00.000Z", "total": "368", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "48", "created_at": "2026-07-09T12:43:00.750Z", "created_by": 1, "updated_at": "2026-07-09T12:43:00.542Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 61, "observaciones": null, "numero_factura": "FC-00000040", "subtotal_con_iva": "320", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-09 12:43:02.004+00
85	2026-07-09 12:47:19.469+00	1	Admin	CREAR	COMPRAS	facturas_compra	34	\N	{"id": 34, "fecha": "2026-07-09T00:00:00.000Z", "total": "195.5", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "25.5", "created_at": "2026-07-09T12:47:18.030Z", "created_by": 1, "updated_at": "2026-07-09T12:47:17.818Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 58, "observaciones": null, "numero_factura": "FC-00000041", "subtotal_con_iva": "170", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-09 12:47:19.469+00
86	2026-07-14 02:13:01.463+00	1	Admin	CREAR	COMPRAS	facturas_compra	35	\N	{"id": 35, "fecha": "2026-07-14T00:00:00.000Z", "total": "1.79", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "0.23", "created_at": "2026-07-14T02:13:00.236Z", "created_by": 1, "updated_at": "2026-07-14T02:12:57.628Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000042", "subtotal_con_iva": "1.56", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-14 02:13:01.463+00
87	2026-07-14 02:59:52.866+00	1	Admin	CREAR	COMPRAS	facturas_compra	36	\N	{"id": 36, "fecha": "2026-07-14T00:00:00.000Z", "total": "8.63", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "1.13", "created_at": "2026-07-14T02:59:51.673Z", "created_by": 1, "updated_at": "2026-07-14T02:59:49.130Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 64, "observaciones": null, "numero_factura": "FC-00000043", "subtotal_con_iva": "7.5", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-14 02:59:52.866+00
88	2026-07-14 03:10:26.238+00	1	Admin	CREAR	COMPRAS	facturas_compra	37	\N	{"id": 37, "fecha": "2026-07-14T00:00:00.000Z", "total": "17.25", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "2.25", "created_at": "2026-07-14T03:10:25.007Z", "created_by": 1, "updated_at": "2026-07-14T03:10:22.470Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000044", "subtotal_con_iva": "15", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-14 03:10:26.238+00
89	2026-07-14 04:39:44.553+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 04:39:44.553+00
90	2026-07-14 04:39:45.208+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 04:39:45.208+00
91	2026-07-14 14:08:59.353+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 14:08:59.353+00
92	2026-07-14 14:08:59.39+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 14:08:59.39+00
93	2026-07-14 16:14:56.131+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:14:56.131+00
94	2026-07-14 16:29:51.106+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:29:51.106+00
95	2026-07-14 16:45:12.223+00	11	DarioTesorero	LOGOUT	COMPRAS	usuarios	11	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:45:12.223+00
96	2026-07-14 16:44:49.016+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:44:49.016+00
97	2026-07-14 16:45:21.126+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:45:21.126+00
98	2026-07-14 16:45:21.76+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:45:21.76+00
99	2026-07-14 16:45:22.312+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:45:22.312+00
100	2026-07-14 16:44:46.241+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:44:46.241+00
101	2026-07-14 16:45:22.968+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:45:22.968+00
102	2026-07-14 16:45:25.931+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:45:25.931+00
103	2026-07-14 16:45:09.035+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:45:09.035+00
104	2026-07-14 16:45:08.83+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:45:08.83+00
105	2026-07-14 16:45:08.125+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:45:08.125+00
106	2026-07-14 16:45:09.429+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-14 16:45:09.429+00
107	2026-07-14 17:42:42.532+00	1	Admin	CREAR	COMPRAS	facturas_compra	48	\N	{"id": 48, "fecha": "2026-07-14T00:00:00.000Z", "total": "184.86", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "24.11", "created_at": "2026-07-14T17:42:32.153Z", "created_by": 1, "updated_at": "2026-07-14T17:42:29.975Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 62, "observaciones": null, "numero_factura": "FC-00000055", "subtotal_con_iva": "160.75", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-14 17:42:42.532+00
108	2026-07-15 03:44:25.057+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-15 03:44:25.057+00
109	2026-07-15 03:54:22.938+00	1	Admin	CREAR	COMPRAS	facturas_compra	50	\N	{"id": 50, "fecha": "2026-07-15T00:00:00.000Z", "total": "141.45", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "18.45", "created_at": "2026-07-15T03:54:21.999Z", "created_by": 1, "updated_at": "2026-07-15T03:54:17.060Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 58, "observaciones": null, "numero_factura": "FC-00000057", "subtotal_con_iva": "123", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-15 03:54:22.938+00
110	2026-07-15 03:56:45.835+00	1	Admin	CREAR	COMPRAS	facturas_compra	51	\N	{"id": 51, "fecha": "2026-07-15T00:00:00.000Z", "total": "282.9", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CREDITO", "total_iva": "36.9", "created_at": "2026-07-15T03:56:45.046Z", "created_by": 1, "updated_at": "2026-07-15T03:56:40.134Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000058", "subtotal_con_iva": "246", "subtotal_sin_iva": "0", "fecha_vencimiento": "2026-07-15T00:00:00.000Z", "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-15 03:56:45.835+00
111	2026-07-15 04:07:32.666+00	1	Admin	CREAR	COMPRAS	facturas_compra	52	\N	{"id": 52, "fecha": "2026-07-15T00:00:00.000Z", "total": "424.35", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "55.35", "created_at": "2026-07-15T04:07:31.407Z", "created_by": 1, "updated_at": "2026-07-15T04:07:26.483Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 58, "observaciones": null, "numero_factura": "FC-00000059", "subtotal_con_iva": "369", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-15 04:07:32.666+00
112	2026-07-15 04:11:33.391+00	1	Admin	CREAR	COMPRAS	facturas_compra	53	\N	{"id": 53, "fecha": "2026-07-15T00:00:00.000Z", "total": "141.45", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "18.45", "created_at": "2026-07-15T04:11:32.283Z", "created_by": 1, "updated_at": "2026-07-15T04:11:27.387Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 58, "observaciones": null, "numero_factura": "FC-00000060", "subtotal_con_iva": "123", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-15 04:11:33.391+00
113	2026-07-15 04:20:23.118+00	1	Admin	CREAR	COMPRAS	facturas_compra	54	\N	{"id": 54, "fecha": "2026-07-15T00:00:00.000Z", "total": "141.45", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "18.45", "created_at": "2026-07-15T04:20:22.000Z", "created_by": 1, "updated_at": "2026-07-15T04:20:17.067Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 58, "observaciones": null, "numero_factura": "FC-00000061", "subtotal_con_iva": "123", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-15 04:20:23.118+00
114	2026-07-15 04:31:03.382+00	1	Admin	CREAR	COMPRAS	facturas_compra	55	\N	{"id": 55, "fecha": "2026-07-15T00:00:00.000Z", "total": "115", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "15", "created_at": "2026-07-15T04:31:02.456Z", "created_by": 1, "updated_at": "2026-07-15T04:30:57.580Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000062", "subtotal_con_iva": "100", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-15 04:31:03.382+00
115	2026-07-15 15:49:36.409+00	1	Admin	CREAR	COMPRAS	facturas_compra	56	\N	{"id": 56, "fecha": "2026-07-15T00:00:00.000Z", "total": "141.45", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "18.45", "created_at": "2026-07-15T15:49:35.210Z", "created_by": 1, "updated_at": "2026-07-15T15:49:35.282Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000063", "subtotal_con_iva": "123", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-15 15:49:36.409+00
116	2026-07-15 16:20:05.75+00	1	Admin	CREAR	COMPRAS	facturas_compra	57	\N	{"id": 57, "fecha": "2026-07-15T00:00:00.000Z", "total": "184", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "24", "created_at": "2026-07-15T16:20:05.169Z", "created_by": 1, "updated_at": "2026-07-15T16:20:05.125Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 58, "observaciones": null, "numero_factura": "FC-00000064", "subtotal_con_iva": "160", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-15 16:20:05.75+00
117	2026-07-15 17:41:16.198+00	1	Admin	CREAR	COMPRAS	facturas_compra	58	\N	{"id": 58, "fecha": "2026-07-15T00:00:00.000Z", "total": "397.9", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "51.9", "created_at": "2026-07-15T17:41:15.483Z", "created_by": 1, "updated_at": "2026-07-15T17:41:15.442Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000065", "subtotal_con_iva": "346", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-15 17:41:16.198+00
118	2026-07-15 17:44:51.574+00	1	Admin	CREAR	COMPRAS	facturas_compra	59	\N	{"id": 59, "fecha": "2026-07-15T00:00:00.000Z", "total": "1025.8", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "133.8", "created_at": "2026-07-15T17:44:50.892Z", "created_by": 1, "updated_at": "2026-07-15T17:44:50.852Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000066", "subtotal_con_iva": "892", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-15 17:44:51.574+00
119	2026-07-15 17:46:42.744+00	1	Admin	CREAR	COMPRAS	facturas_compra	60	\N	{"id": 60, "fecha": "2026-07-15T00:00:00.000Z", "total": "141.45", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CREDITO", "total_iva": "18.45", "created_at": "2026-07-15T17:46:42.245Z", "created_by": 1, "updated_at": "2026-07-15T17:46:42.203Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000067", "subtotal_con_iva": "123", "subtotal_sin_iva": "0", "fecha_vencimiento": "2026-07-15T00:00:00.000Z", "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-15 17:46:42.744+00
120	2026-07-15 17:53:12.578+00	4	EsauHidalgo	ELIMINAR	COMPRAS	proveedor	62	{"id": 62, "tipo": "CONTADO", "banco": null, "email": "cmarthyea@hotmail.com", "ciudad": "Ibarra", "estado": "ACTIVO", "nombre": "Dario Lopez", "telefono": "0961199909", "cedulaRuc": "1004384227", "createdAt": "2026-06-23T04:00:52.754Z", "deletedAt": null, "direccion": "Rio Yazuni 1-82", "updatedAt": "2026-06-23T04:00:52.754Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	{"id": 62, "tipo": "CONTADO", "banco": null, "email": "cmarthyea@hotmail.com", "ciudad": "Ibarra", "estado": "INACTIVO", "nombre": "Dario Lopez", "telefono": "0961199909", "cedulaRuc": "1004384227", "createdAt": "2026-06-23T04:00:52.754Z", "deletedAt": "2026-07-15T17:53:12.480Z", "direccion": "Rio Yazuni 1-82", "updatedAt": "2026-07-15T17:53:12.527Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	EXITO	Eliminación lógica de proveedor	\N	\N	2026-07-15 17:53:12.578+00
121	2026-07-16 02:23:26.285+00	4	EsauHidalgo	ELIMINAR	COMPRAS	proveedor	61	{"id": 61, "tipo": "CREDITO", "banco": null, "email": "cmarthyea@hotmail.com", "ciudad": "Ibarra", "estado": "ACTIVO", "nombre": "Dario Lopez", "telefono": "0961199909", "cedulaRuc": "1004384226", "createdAt": "2026-06-23T04:00:30.618Z", "deletedAt": null, "direccion": "Rio Yazuni 1-82", "updatedAt": "2026-06-23T04:00:30.618Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	{"id": 61, "tipo": "CREDITO", "banco": null, "email": "cmarthyea@hotmail.com", "ciudad": "Ibarra", "estado": "INACTIVO", "nombre": "Dario Lopez", "telefono": "0961199909", "cedulaRuc": "1004384226", "createdAt": "2026-06-23T04:00:30.618Z", "deletedAt": "2026-07-16T02:23:25.508Z", "direccion": "Rio Yazuni 1-82", "updatedAt": "2026-07-16T02:23:24.410Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	EXITO	Eliminación lógica de proveedor	\N	\N	2026-07-16 02:23:26.285+00
122	2026-07-16 02:23:26.856+00	4	EsauHidalgo	ELIMINAR	COMPRAS	proveedor	60	{"id": 60, "tipo": "CREDITO", "banco": null, "email": "a@q.com", "ciudad": "Ibarra", "estado": "ACTIVO", "nombre": "Antonio Quiña", "telefono": "0961199909", "cedulaRuc": "1002322385", "createdAt": "2026-06-16T17:43:38.099Z", "deletedAt": null, "direccion": "Rio Yazuni 1-825", "updatedAt": "2026-06-16T17:44:52.010Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	{"id": 60, "tipo": "CREDITO", "banco": null, "email": "a@q.com", "ciudad": "Ibarra", "estado": "INACTIVO", "nombre": "Antonio Quiña", "telefono": "0961199909", "cedulaRuc": "1002322385", "createdAt": "2026-06-16T17:43:38.099Z", "deletedAt": "2026-07-16T02:23:26.685Z", "direccion": "Rio Yazuni 1-825", "updatedAt": "2026-07-16T02:23:25.033Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	EXITO	Eliminación lógica de proveedor	\N	\N	2026-07-16 02:23:26.856+00
123	2026-07-16 02:23:38.114+00	4	EsauHidalgo	ACTUALIZAR	COMPRAS	proveedor	61	{"id": 61, "tipo": "CREDITO", "banco": null, "email": "cmarthyea@hotmail.com", "ciudad": "Ibarra", "estado": "INACTIVO", "nombre": "Dario Lopez", "telefono": "0961199909", "cedulaRuc": "1004384226", "createdAt": "2026-06-23T04:00:30.618Z", "deletedAt": "2026-07-16T02:23:25.508Z", "direccion": "Rio Yazuni 1-82", "updatedAt": "2026-07-16T02:23:24.410Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	{"id": 61, "tipo": "CREDITO", "banco": null, "email": "cmarthyea@hotmail.com", "ciudad": "Ibarra", "estado": "ACTIVO", "nombre": "Dario Lopez", "telefono": "0961199909", "cedulaRuc": "1004384226", "createdAt": "2026-06-23T04:00:30.618Z", "deletedAt": null, "direccion": "Rio Yazuni 1-82", "updatedAt": "2026-07-16T02:23:36.290Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	EXITO	Actualización de proveedor	\N	\N	2026-07-16 02:23:38.114+00
124	2026-07-16 02:26:58.985+00	1	Admin	CREAR	COMPRAS	facturas_compra	63	\N	{"id": 63, "fecha": "2026-07-16T00:00:00.000Z", "total": "115", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CREDITO", "total_iva": "15", "created_at": "2026-07-16T02:26:58.029Z", "created_by": 1, "updated_at": "2026-07-16T02:26:56.211Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000070", "subtotal_con_iva": "100", "subtotal_sin_iva": "0", "fecha_vencimiento": "2026-07-16T00:00:00.000Z", "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-16 02:26:58.985+00
125	2026-07-16 02:28:30.794+00	1	Admin	CREAR	COMPRAS	facturas_compra	64	\N	{"id": 64, "fecha": "2026-07-16T00:00:00.000Z", "total": "141.45", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CREDITO", "total_iva": "18.45", "created_at": "2026-07-16T02:28:29.911Z", "created_by": 1, "updated_at": "2026-07-16T02:28:28.094Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000071", "subtotal_con_iva": "123", "subtotal_sin_iva": "0", "fecha_vencimiento": "2026-07-16T00:00:00.000Z", "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-16 02:28:30.794+00
126	2026-07-16 02:29:42.768+00	1	Admin	CREAR	COMPRAS	facturas_compra	65	\N	{"id": 65, "fecha": "2026-07-16T00:00:00.000Z", "total": "141.45", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CREDITO", "total_iva": "18.45", "created_at": "2026-07-16T02:29:42.274Z", "created_by": 1, "updated_at": "2026-07-16T02:29:42.231Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000072", "subtotal_con_iva": "123", "subtotal_sin_iva": "0", "fecha_vencimiento": "2026-07-16T00:00:00.000Z", "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-16 02:29:42.768+00
127	2026-07-16 02:35:47.524+00	1	Admin	CREAR	COMPRAS	facturas_compra	66	\N	{"id": 66, "fecha": "2026-07-16T00:00:00.000Z", "total": "115", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CREDITO", "total_iva": "15", "created_at": "2026-07-16T02:35:46.575Z", "created_by": 1, "updated_at": "2026-07-16T02:35:44.759Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000073", "subtotal_con_iva": "100", "subtotal_sin_iva": "0", "fecha_vencimiento": "2026-07-16T00:00:00.000Z", "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-16 02:35:47.524+00
128	2026-07-16 02:41:19.149+00	4	EsauHidalgo	ELIMINAR	COMPRAS	proveedor	61	{"id": 61, "tipo": "CREDITO", "banco": null, "email": "cmarthyea@hotmail.com", "ciudad": "Ibarra", "estado": "ACTIVO", "nombre": "Dario Lopez", "telefono": "0961199909", "cedulaRuc": "1004384226", "createdAt": "2026-06-23T04:00:30.618Z", "deletedAt": null, "direccion": "Rio Yazuni 1-82", "updatedAt": "2026-07-16T02:23:36.290Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	{"id": 61, "tipo": "CREDITO", "banco": null, "email": "cmarthyea@hotmail.com", "ciudad": "Ibarra", "estado": "INACTIVO", "nombre": "Dario Lopez", "telefono": "0961199909", "cedulaRuc": "1004384226", "createdAt": "2026-06-23T04:00:30.618Z", "deletedAt": "2026-07-16T02:41:16.350Z", "direccion": "Rio Yazuni 1-82", "updatedAt": "2026-07-16T02:41:17.317Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	EXITO	Eliminación lógica de proveedor	\N	\N	2026-07-16 02:41:19.149+00
129	2026-07-16 02:41:33.629+00	4	EsauHidalgo	ACTUALIZAR	COMPRAS	proveedor	64	{"id": 64, "tipo": "CREDITO", "banco": null, "email": "correo@ejemplo.com", "ciudad": "Quito", "estado": "INACTIVO", "nombre": "Laura Shiji", "telefono": "0999316866", "cedulaRuc": "1050135788", "createdAt": "2026-06-28T22:59:59.108Z", "deletedAt": "2026-07-02T16:14:36.764Z", "direccion": "Simon Bolivar 15", "updatedAt": "2026-07-02T16:14:36.795Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	{"id": 64, "tipo": "CREDITO", "banco": null, "email": "correo@ejemplo.com", "ciudad": "Quito", "estado": "ACTIVO", "nombre": "Laura Shiji", "telefono": "0999316866", "cedulaRuc": "1050135788", "createdAt": "2026-06-28T22:59:59.108Z", "deletedAt": null, "direccion": "Simon Bolivar 15", "updatedAt": "2026-07-16T02:41:31.815Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	EXITO	Actualización de proveedor	\N	\N	2026-07-16 02:41:33.629+00
130	2026-07-16 02:41:49.036+00	4	EsauHidalgo	ACTUALIZAR	COMPRAS	proveedor	61	{"id": 61, "tipo": "CREDITO", "banco": null, "email": "cmarthyea@hotmail.com", "ciudad": "Ibarra", "estado": "INACTIVO", "nombre": "Dario Lopez", "telefono": "0961199909", "cedulaRuc": "1004384226", "createdAt": "2026-06-23T04:00:30.618Z", "deletedAt": "2026-07-16T02:41:16.350Z", "direccion": "Rio Yazuni 1-82", "updatedAt": "2026-07-16T02:41:17.317Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	{"id": 61, "tipo": "CREDITO", "banco": null, "email": "cmarthyea@hotmail.com", "ciudad": "Ibarra", "estado": "ACTIVO", "nombre": "Dario Lopez", "telefono": "0961199909", "cedulaRuc": "1004384226", "createdAt": "2026-06-23T04:00:30.618Z", "deletedAt": null, "direccion": "Rio Yazuni 1-82", "updatedAt": "2026-07-16T02:41:47.213Z", "created_by": 1, "updated_by": null, "tipo_cuenta": null, "numero_cuenta": null}	EXITO	Actualización de proveedor	\N	\N	2026-07-16 02:41:49.036+00
131	2026-07-17 02:38:37.631+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 02:38:37.631+00
132	2026-07-17 02:56:50.654+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 02:56:50.654+00
133	2026-07-17 02:57:44.943+00	11	DarioTesorero	LOGOUT	COMPRAS	usuarios	11	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 02:57:44.943+00
134	2026-07-17 02:58:08.226+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 02:58:08.226+00
135	2026-07-17 04:00:35.848+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 04:00:35.848+00
136	2026-07-17 05:04:54.449+00	10	DarioComprador	LOGOUT	COMPRAS	usuarios	10	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 05:04:54.449+00
137	2026-07-17 05:23:26.131+00	1	Admin	CREAR	COMPRAS	facturas_compra	67	\N	{"id": 67, "fecha": "2026-07-17T00:00:00.000Z", "total": "282.9", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "36.9", "created_at": "2026-07-17T05:23:25.091Z", "created_by": 1, "updated_at": "2026-07-17T05:23:25.515Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000074", "subtotal_con_iva": "246", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-17 05:23:26.131+00
138	2026-07-17 05:23:54.404+00	10	DarioComprador	LOGOUT	COMPRAS	usuarios	10	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 05:23:54.404+00
139	2026-07-17 05:57:30.867+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 05:57:30.867+00
140	2026-07-17 06:11:22.199+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 06:11:22.199+00
141	2026-07-17 14:04:01.632+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 14:04:01.632+00
142	2026-07-17 14:04:01.629+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 14:04:01.629+00
143	2026-07-17 14:04:45.315+00	10	DarioComprador	LOGOUT	COMPRAS	usuarios	10	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 14:04:45.315+00
144	2026-07-17 14:27:41.988+00	11	DarioTesorero	LOGOUT	COMPRAS	usuarios	11	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 14:27:41.988+00
145	2026-07-17 15:17:59.908+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 15:17:59.908+00
146	2026-07-17 15:32:07.998+00	11	DarioTesorero	LOGOUT	COMPRAS	usuarios	11	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 15:32:07.998+00
147	2026-07-17 15:32:27.897+00	10	DarioComprador	LOGOUT	COMPRAS	usuarios	10	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 15:32:27.897+00
148	2026-07-17 16:08:30.671+00	1	Admin	CREAR	COMPRAS	facturas_compra	68	\N	{"id": 68, "fecha": "2026-07-17T00:00:00.000Z", "total": "736", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CONTADO", "total_iva": "96", "created_at": "2026-07-17T16:08:29.594Z", "created_by": 1, "updated_at": "2026-07-17T16:08:29.720Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 58, "observaciones": null, "numero_factura": "FC-00000075", "subtotal_con_iva": "640", "subtotal_sin_iva": "0", "fecha_vencimiento": null, "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-17 16:08:30.671+00
149	2026-07-17 16:14:30.551+00	1	Admin	CREAR	COMPRAS	facturas_compra	69	\N	{"id": 69, "fecha": "2026-07-17T00:00:00.000Z", "total": "184", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CREDITO", "total_iva": "24", "created_at": "2026-07-17T16:14:29.172Z", "created_by": 1, "updated_at": "2026-07-17T16:14:29.311Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 58, "observaciones": null, "numero_factura": "FC-00000076", "subtotal_con_iva": "160", "subtotal_sin_iva": "0", "fecha_vencimiento": "2026-07-25T00:00:00.000Z", "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-17 16:14:30.551+00
150	2026-07-17 16:38:09.061+00	10	DarioComprador	LOGOUT	COMPRAS	usuarios	10	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 16:38:09.061+00
151	2026-07-17 16:38:52.721+00	4	EsauHidalgo	LOGOUT	COMPRAS	usuarios	4	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 16:38:52.721+00
152	2026-07-17 16:39:39.455+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 16:39:39.455+00
153	2026-07-17 16:40:26.752+00	11	DarioTesorero	LOGOUT	COMPRAS	usuarios	11	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 16:40:26.752+00
154	2026-07-17 16:40:56.891+00	11	DarioTesorero	LOGOUT	COMPRAS	usuarios	11	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 16:40:56.891+00
155	2026-07-17 16:45:43.224+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 16:45:43.224+00
156	2026-07-17 16:45:43.227+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 16:45:43.227+00
157	2026-07-17 16:45:56.57+00	9	LopezDario	LOGIN	COMPRAS	N/A	\N	\N	\N	EXITO	Inicio de sesión en Módulo de Compras	\N	\N	2026-07-17 16:45:56.57+00
158	2026-07-17 16:46:08.707+00	9	LopezDario	LOGOUT	COMPRAS	usuarios	9	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 16:46:08.707+00
159	2026-07-17 16:46:52.672+00	10	DarioComprador	LOGIN	COMPRAS	N/A	\N	\N	\N	EXITO	Inicio de sesión en Módulo de Compras	\N	\N	2026-07-17 16:46:52.672+00
160	2026-07-17 16:52:51.828+00	1	Admin	CREAR	COMPRAS	facturas_compra	70	\N	{"id": 70, "fecha": "2026-07-17T00:00:00.000Z", "total": "141.45", "estado": "EMITIDA", "pdf_url": null, "tipo_pago": "CREDITO", "total_iva": "18.45", "created_at": "2026-07-17T16:52:50.261Z", "created_by": 1, "updated_at": "2026-07-17T16:52:50.448Z", "updated_by": null, "pdf_generado": true, "proveedor_id": 59, "observaciones": null, "numero_factura": "FC-00000077", "subtotal_con_iva": "123", "subtotal_sin_iva": "0", "fecha_vencimiento": "2026-07-31T00:00:00.000Z", "numero_factura_proveedor": null}	EXITO	Generación completa de Factura	\N	\N	2026-07-17 16:52:51.828+00
161	2026-07-17 16:53:06.904+00	10	DarioComprador	LOGOUT	COMPRAS	usuarios	10	\N	\N	EXITO	Cierre de sesión	\N	\N	2026-07-17 16:53:06.904+00
162	2026-07-17 16:53:19.074+00	11	DarioTesorero	LOGIN	COMPRAS	N/A	\N	\N	\N	EXITO	Inicio de sesión en Módulo de Compras	\N	\N	2026-07-17 16:53:19.074+00
\.


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proveedores (id, cedula_ruc, nombre, ciudad, tipo_proveedor, direccion, telefono, email, estado, created_by, updated_by, created_at, updated_at, deleted_at, banco, numero_cuenta, tipo_cuenta) FROM stdin;
4	1003790001	DISTRIBUIDORA BCD CIA LTDA	Guayaquil	CREDITO	Avenida Principal 1	0980000001	ventas1@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
5	1003790002	DISTRIBUIDORA CDE CIA LTDA	Ibarra	CONTADO	Avenida Principal 2	0980000002	ventas2@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
6	1003790003	DISTRIBUIDORA DEF CIA LTDA	Quito	CREDITO	Avenida Principal 3	0980000003	ventas3@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
7	1003790004	DISTRIBUIDORA EFG CIA LTDA	Guayaquil	CONTADO	Avenida Principal 4	0980000004	ventas4@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
8	1003790005	DISTRIBUIDORA FGH CIA LTDA	Ibarra	CREDITO	Avenida Principal 5	0980000005	ventas5@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
9	1003790006	DISTRIBUIDORA GHI CIA LTDA	Quito	CONTADO	Avenida Principal 6	0980000006	ventas6@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
10	1003790007	DISTRIBUIDORA HIJ CIA LTDA	Guayaquil	CREDITO	Avenida Principal 7	0980000007	ventas7@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
11	1003790008	DISTRIBUIDORA IJK CIA LTDA	Ibarra	CONTADO	Avenida Principal 8	0980000008	ventas8@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
12	1003790009	DISTRIBUIDORA JKL CIA LTDA	Quito	CREDITO	Avenida Principal 9	0980000009	ventas9@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
13	1003790010	DISTRIBUIDORA KLM CIA LTDA	Guayaquil	CONTADO	Avenida Principal 10	0980000010	ventas10@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
14	1003790011	DISTRIBUIDORA LMN CIA LTDA	Ibarra	CREDITO	Avenida Principal 11	0980000011	ventas11@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
15	1003790012	DISTRIBUIDORA MNO CIA LTDA	Quito	CONTADO	Avenida Principal 12	0980000012	ventas12@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
16	1003790013	DISTRIBUIDORA NOP CIA LTDA	Guayaquil	CREDITO	Avenida Principal 13	0980000013	ventas13@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
17	1003790014	DISTRIBUIDORA OPQ CIA LTDA	Ibarra	CONTADO	Avenida Principal 14	0980000014	ventas14@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
18	1003790015	DISTRIBUIDORA PQR CIA LTDA	Quito	CREDITO	Avenida Principal 15	0980000015	ventas15@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
19	1003790016	DISTRIBUIDORA QRS CIA LTDA	Guayaquil	CONTADO	Avenida Principal 16	0980000016	ventas16@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
20	1003790017	DISTRIBUIDORA RST CIA LTDA	Ibarra	CREDITO	Avenida Principal 17	0980000017	ventas17@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
21	1003790018	DISTRIBUIDORA STU CIA LTDA	Quito	CONTADO	Avenida Principal 18	0980000018	ventas18@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
22	1003790019	DISTRIBUIDORA TUV CIA LTDA	Guayaquil	CREDITO	Avenida Principal 19	0980000019	ventas19@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
23	1003790020	DISTRIBUIDORA UVW CIA LTDA	Ibarra	CONTADO	Avenida Principal 20	0980000020	ventas20@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
24	1003790021	DISTRIBUIDORA VWX CIA LTDA	Quito	CREDITO	Avenida Principal 21	0980000021	ventas21@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
25	1003790022	DISTRIBUIDORA WXY CIA LTDA	Guayaquil	CONTADO	Avenida Principal 22	0980000022	ventas22@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
26	1003790023	DISTRIBUIDORA XYZ CIA LTDA	Ibarra	CREDITO	Avenida Principal 23	0980000023	ventas23@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
27	1003790024	DISTRIBUIDORA YZA CIA LTDA	Quito	CONTADO	Avenida Principal 24	0980000024	ventas24@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
28	1003790025	DISTRIBUIDORA ZAB CIA LTDA	Guayaquil	CREDITO	Avenida Principal 25	0980000025	ventas25@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
29	1003790026	DISTRIBUIDORA ABC CIA LTDA	Ibarra	CONTADO	Avenida Principal 26	0980000026	ventas26@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
30	1003790027	DISTRIBUIDORA BCD CIA LTDA	Quito	CREDITO	Avenida Principal 27	0980000027	ventas27@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
31	1003790028	DISTRIBUIDORA CDE CIA LTDA	Guayaquil	CONTADO	Avenida Principal 28	0980000028	ventas28@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
32	1003790029	DISTRIBUIDORA DEF CIA LTDA	Ibarra	CREDITO	Avenida Principal 29	0980000029	ventas29@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
33	1003790030	DISTRIBUIDORA EFG CIA LTDA	Quito	CONTADO	Avenida Principal 30	0980000030	ventas30@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
34	1003790031	DISTRIBUIDORA FGH CIA LTDA	Guayaquil	CREDITO	Avenida Principal 31	0980000031	ventas31@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
35	1003790032	DISTRIBUIDORA GHI CIA LTDA	Ibarra	CONTADO	Avenida Principal 32	0980000032	ventas32@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
36	1003790033	DISTRIBUIDORA HIJ CIA LTDA	Quito	CREDITO	Avenida Principal 33	0980000033	ventas33@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
37	1003790034	DISTRIBUIDORA IJK CIA LTDA	Guayaquil	CONTADO	Avenida Principal 34	0980000034	ventas34@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
38	1003790035	DISTRIBUIDORA JKL CIA LTDA	Ibarra	CREDITO	Avenida Principal 35	0980000035	ventas35@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
39	1003790036	DISTRIBUIDORA KLM CIA LTDA	Quito	CONTADO	Avenida Principal 36	0980000036	ventas36@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
40	1003790037	DISTRIBUIDORA LMN CIA LTDA	Guayaquil	CREDITO	Avenida Principal 37	0980000037	ventas37@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
41	1003790038	DISTRIBUIDORA MNO CIA LTDA	Ibarra	CONTADO	Avenida Principal 38	0980000038	ventas38@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
42	1003790039	DISTRIBUIDORA NOP CIA LTDA	Quito	CREDITO	Avenida Principal 39	0980000039	ventas39@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
43	1003790040	DISTRIBUIDORA OPQ CIA LTDA	Guayaquil	CONTADO	Avenida Principal 40	0980000040	ventas40@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
45	1003790042	DISTRIBUIDORA QRS CIA LTDA	Quito	CONTADO	Avenida Principal 42	0980000042	ventas42@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
46	1003790043	DISTRIBUIDORA RST CIA LTDA	Guayaquil	CREDITO	Avenida Principal 43	0980000043	ventas43@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
47	1003790044	DISTRIBUIDORA STU CIA LTDA	Ibarra	CONTADO	Avenida Principal 44	0980000044	ventas44@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
48	1003790045	DISTRIBUIDORA TUV CIA LTDA	Quito	CREDITO	Avenida Principal 45	0980000045	ventas45@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
49	1003790046	DISTRIBUIDORA UVW CIA LTDA	Guayaquil	CONTADO	Avenida Principal 46	0980000046	ventas46@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
50	1003790047	DISTRIBUIDORA VWX CIA LTDA	Ibarra	CREDITO	Avenida Principal 47	0980000047	ventas47@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
51	1003790048	DISTRIBUIDORA WXY CIA LTDA	Quito	CONTADO	Avenida Principal 48	0980000048	ventas48@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
52	1003790049	DISTRIBUIDORA XYZ CIA LTDA	Guayaquil	CREDITO	Avenida Principal 49	0980000049	ventas49@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
53	1003790050	DISTRIBUIDORA YZA CIA LTDA	Ibarra	CONTADO	Avenida Principal 50	0980000050	ventas50@distribuidora.com	ACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-06-15 22:26:37.743835+00	\N	\N	\N	\N
56	1003794112	Carlos Prado	Ibarra EC	CREDITO	Ramon Alarcon y Jose Nicolas Hida	0979819634	aldahirrequene@gmail.com	INACTIVO	1	\N	2026-06-16 03:44:42.921+00	2026-06-16 14:18:42.252954+00	2026-06-16 14:18:40.042+00	\N	\N	\N
55	1003794110	Carlos	Ibarra EC	CREDITO	Ramon Alarcon y Jose Nicolas Hidalgo	0979819634	aldahirrequene@gmail.com	INACTIVO	1	\N	2026-06-16 03:44:11.908+00	2026-06-16 14:19:09.171166+00	2026-06-16 14:19:07.842+00	\N	\N	\N
54	1003794093	Aldhair Requene	Ibarra EC	CONTADO	Ramon Alarcon y Jose Nicolas Hidalgo	0979819634	aldahirrequene@gmail.com	INACTIVO	1	\N	2026-06-16 00:02:02.849+00	2026-06-16 16:51:51.885987+00	2026-06-16 16:51:50.554+00	\N	\N	\N
57	1000135787	Dario Lopez	Ibarra	CONTADO	Rio Yazuni 1-82	0961199909	asdasd@gmail.com	ACTIVO	1	\N	2026-06-16 16:59:50.433+00	2026-06-16 16:59:50.433+00	\N	\N	\N	\N
58	1005228114	Esau 	Ibarra	CREDITO	Ramon Alarco	0979819634	aldahirrequene@gmail.com	ACTIVO	1	\N	2026-06-16 17:10:31.312+00	2026-06-16 17:10:31.312+00	\N	\N	\N	\N
59	1003794094	Esau 	Ibarra EC	CONTADO	Ramon Alarco	0979819634	aldahirrequene@gmail.com	ACTIVO	1	\N	2026-06-16 17:25:24.746+00	2026-06-16 17:25:24.746+00	\N	\N	\N	\N
63	1050135787	Jairo Farinango	Ibarra	CREDITO	Ibarra, Imbabura	0999316865	longraft22@gmail.com	INACTIVO	1	\N	2026-06-23 15:22:39.389+00	2026-07-07 17:03:26.452402+00	2026-07-07 17:03:26.295+00	\N	\N	\N
44	1003790041	DISTRIBUIDORA PQR CIA LTDA	Ibarra	CREDITO	Avenida Principal 41	0980000041	ventas41@distribuidora.com	INACTIVO	1	\N	2026-06-15 22:26:37.743835+00	2026-07-07 17:33:38.209247+00	2026-07-07 17:33:38.062+00	\N	\N	\N
62	1004384227	Dario Lopez	Ibarra	CONTADO	Rio Yazuni 1-82	0961199909	cmarthyea@hotmail.com	INACTIVO	1	\N	2026-06-23 04:00:52.754+00	2026-07-15 17:53:12.527355+00	2026-07-15 17:53:12.48+00	\N	\N	\N
60	1002322385	Antonio Quiña	Ibarra	CREDITO	Rio Yazuni 1-825	0961199909	a@q.com	INACTIVO	1	\N	2026-06-16 17:43:38.099+00	2026-07-16 02:23:25.033919+00	2026-07-16 02:23:26.685+00	\N	\N	\N
64	1050135788	Laura Shiji	Quito	CREDITO	Simon Bolivar 15	0999316866	correo@ejemplo.com	ACTIVO	1	\N	2026-06-28 22:59:59.108+00	2026-07-16 02:41:31.81509+00	\N	\N	\N	\N
61	1004384226	Dario Lopez	Ibarra	CREDITO	Rio Yazuni 1-82	0961199909	cmarthyea@hotmail.com	ACTIVO	1	\N	2026-06-23 04:00:30.618+00	2026-07-16 02:41:47.213753+00	\N	\N	\N	\N
\.


--
-- Data for Name: saldos_credito_proveedor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.saldos_credito_proveedor (id, proveedor_id, factura_id, monto_credito, monto_pagado, fecha_vencimiento, estado, created_at, updated_at) FROM stdin;
1	59	51	282.90	282.90	2026-07-15	PAGADO	2026-07-15 03:56:45.364+00	2026-07-15 03:57:09.723228+00
2	59	60	141.45	141.45	2026-07-15	PAGADO	2026-07-15 17:46:42.494+00	2026-07-15 17:47:51.477269+00
3	59	63	115.00	115.00	2026-07-16	PAGADO	2026-07-16 02:26:58.541+00	2026-07-16 02:30:01.39626+00
4	59	64	141.45	141.45	2026-07-16	PAGADO	2026-07-16 02:28:30.354+00	2026-07-16 02:30:21.144174+00
5	59	65	141.45	141.45	2026-07-16	PAGADO	2026-07-16 02:29:42.521+00	2026-07-16 02:37:49.25027+00
6	59	66	115.00	115.00	2026-07-16	PAGADO	2026-07-16 02:35:47.066+00	2026-07-17 05:25:29.628733+00
9	58	69	61.33	0.00	2026-08-24	PENDIENTE	2026-07-17 16:14:30.05+00	2026-07-17 16:14:30.05+00
7	58	69	61.33	61.33	2026-07-25	PAGADO	2026-07-17 16:14:29.715+00	2026-07-17 16:15:26.505072+00
8	58	69	61.33	61.33	2026-08-09	PAGADO	2026-07-17 16:14:29.884+00	2026-07-17 16:15:32.195097+00
10	59	70	35.36	0.00	2026-07-31	PENDIENTE	2026-07-17 16:52:50.816+00	2026-07-17 16:52:50.816+00
11	59	70	35.36	0.00	2026-08-15	PENDIENTE	2026-07-17 16:52:50.986+00	2026-07-17 16:52:50.986+00
12	59	70	35.36	0.00	2026-08-30	PENDIENTE	2026-07-17 16:52:51.152+00	2026-07-17 16:52:51.152+00
13	59	70	35.36	0.00	2026-09-14	PENDIENTE	2026-07-17 16:52:51.318+00	2026-07-17 16:52:51.318+00
\.


--
-- Name: catalogo_proveedor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.catalogo_proveedor_id_seq', 35, true);


--
-- Name: detalle_factura_compra_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.detalle_factura_compra_id_seq', 74, true);


--
-- Name: facturas_compra_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.facturas_compra_id_seq', 70, true);


--
-- Name: gastos_cxc_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.gastos_cxc_id_seq', 19, true);


--
-- Name: pista_auditoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pista_auditoria_id_seq', 162, true);


--
-- Name: proveedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.proveedores_id_seq', 65, true);


--
-- Name: saldos_credito_proveedor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.saldos_credito_proveedor_id_seq', 13, true);


--
-- Name: seq_numero_factura; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.seq_numero_factura', 77, true);


--
-- Name: catalogo_proveedor catalogo_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_proveedor
    ADD CONSTRAINT catalogo_proveedor_pkey PRIMARY KEY (id);


--
-- Name: detalle_factura_compra detalle_factura_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura_compra
    ADD CONSTRAINT detalle_factura_compra_pkey PRIMARY KEY (id);


--
-- Name: facturas_compra facturas_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_compra
    ADD CONSTRAINT facturas_compra_pkey PRIMARY KEY (id);


--
-- Name: gastos_cxc gastos_cxc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gastos_cxc
    ADD CONSTRAINT gastos_cxc_pkey PRIMARY KEY (id);


--
-- Name: pista_auditoria pista_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pista_auditoria
    ADD CONSTRAINT pista_auditoria_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: saldos_credito_proveedor saldos_credito_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saldos_credito_proveedor
    ADD CONSTRAINT saldos_credito_proveedor_pkey PRIMARY KEY (id);


--
-- Name: facturas_compra uq_facturas_compra_numero; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_compra
    ADD CONSTRAINT uq_facturas_compra_numero UNIQUE (numero_factura);


--
-- Name: proveedores uq_proveedores_cedula_ruc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT uq_proveedores_cedula_ruc UNIQUE (cedula_ruc);


--
-- Name: gastos_cxc_cuenta_bancaria_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gastos_cxc_cuenta_bancaria_id_idx ON public.gastos_cxc USING btree (cuenta_bancaria_id);


--
-- Name: idx_auditoria_accion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_accion ON public.pista_auditoria USING btree (accion);


--
-- Name: idx_auditoria_fecha_hora; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_fecha_hora ON public.pista_auditoria USING btree (fecha_hora);


--
-- Name: idx_auditoria_tabla; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_tabla ON public.pista_auditoria USING btree (tabla_afectada);


--
-- Name: idx_auditoria_usuario_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_usuario_fecha ON public.pista_auditoria USING btree (usuario_id, fecha_hora DESC);


--
-- Name: idx_auditoria_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_usuario_id ON public.pista_auditoria USING btree (usuario_id);


--
-- Name: idx_catalogo_producto_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_catalogo_producto_codigo ON public.catalogo_proveedor USING btree (producto_codigo);


--
-- Name: idx_catalogo_proveedor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_catalogo_proveedor_id ON public.catalogo_proveedor USING btree (proveedor_id);


--
-- Name: idx_detalle_factura_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_factura_id ON public.detalle_factura_compra USING btree (factura_id);


--
-- Name: idx_detalle_producto_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_producto_codigo ON public.detalle_factura_compra USING btree (producto_codigo);


--
-- Name: idx_detalle_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_producto_id ON public.detalle_factura_compra USING btree (producto_id);


--
-- Name: idx_detalle_producto_nombre_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_producto_nombre_trgm ON public.detalle_factura_compra USING gin (producto_nombre public.gin_trgm_ops);


--
-- Name: idx_facturas_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_estado ON public.facturas_compra USING btree (estado);


--
-- Name: idx_facturas_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_fecha ON public.facturas_compra USING btree (fecha);


--
-- Name: idx_facturas_proveedor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_proveedor ON public.facturas_compra USING btree (proveedor_id);


--
-- Name: idx_facturas_tipo_pago; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_tipo_pago ON public.facturas_compra USING btree (tipo_pago);


--
-- Name: idx_facturas_vencimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_vencimiento ON public.facturas_compra USING btree (fecha_vencimiento) WHERE ((tipo_pago = 'CREDITO'::public.tipo_pago_enum) AND (estado = 'EMITIDA'::public.estado_factura_enum));


--
-- Name: idx_saldos_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saldos_estado ON public.saldos_credito_proveedor USING btree (estado);


--
-- Name: idx_saldos_proveedor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saldos_proveedor_id ON public.saldos_credito_proveedor USING btree (proveedor_id);


--
-- Name: idx_saldos_proveedor_pendiente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saldos_proveedor_pendiente ON public.saldos_credito_proveedor USING btree (proveedor_id) WHERE (estado = 'PENDIENTE'::public.estado_saldo_enum);


--
-- Name: uq_catalogo_proveedor_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_catalogo_proveedor_producto ON public.catalogo_proveedor USING btree (proveedor_id, producto_codigo);


--
-- Name: detalle_factura_compra trg_bloquear_detalle_emitida; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bloquear_detalle_emitida BEFORE INSERT OR DELETE OR UPDATE ON public.detalle_factura_compra FOR EACH ROW EXECUTE FUNCTION public.fn_bloquear_detalle_factura_emitida();


--
-- Name: facturas_compra trg_bloquear_factura_emitida; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bloquear_factura_emitida BEFORE UPDATE ON public.facturas_compra FOR EACH ROW EXECUTE FUNCTION public.fn_bloquear_factura_emitida();


--
-- Name: detalle_factura_compra trg_detalle_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_detalle_updated_at BEFORE UPDATE ON public.detalle_factura_compra FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: facturas_compra trg_facturas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_facturas_updated_at BEFORE UPDATE ON public.facturas_compra FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: proveedores trg_proveedores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_proveedores_updated_at BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: detalle_factura_compra trg_recalcular_totales_factura; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recalcular_totales_factura AFTER INSERT OR DELETE OR UPDATE ON public.detalle_factura_compra FOR EACH ROW EXECUTE FUNCTION public.fn_recalcular_totales_factura();


--
-- Name: saldos_credito_proveedor trg_saldos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_saldos_updated_at BEFORE UPDATE ON public.saldos_credito_proveedor FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: catalogo_proveedor catalogo_proveedor_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_proveedor
    ADD CONSTRAINT catalogo_proveedor_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict X5MComKAIsREptvE8ubekgXMbqrg2PBefNXqIHaxy7pKTUDZdpTfzb6s2pJTagN

