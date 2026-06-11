-- Migración PostgreSQL para tabla proveedores

-- Tipos enumerados
CREATE TYPE tipo_proveedor_enum AS ENUM ('CONTADO', 'CREDITO');
CREATE TYPE estado_proveedor_enum AS ENUM ('ACTIVO', 'INACTIVO');

CREATE TABLE public.proveedores (
    id SERIAL PRIMARY KEY,
    cedula_ruc VARCHAR(13) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    tipo tipo_proveedor_enum NOT NULL,
    direccion TEXT NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    estado estado_proveedor_enum NOT NULL DEFAULT 'ACTIVO',
    
    -- Manejo de soft delete
    deleted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX idx_proveedores_estado ON public.proveedores(estado);
CREATE INDEX idx_proveedores_tipo ON public.proveedores(tipo);
