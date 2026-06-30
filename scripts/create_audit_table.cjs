const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || 'postgresql://postgres.xugrbubhckwzgugpxtoi:Compras123.@aws-1-us-west-2.pooler.supabase.com:5432/postgres',
});

async function main() {
  try {
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE accion_auditoria_enum AS ENUM (
          'LOGIN', 'LOGOUT', 'CREAR', 'ACTUALIZAR', 'ELIMINAR', 'IMPRIMIR'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('Enum OK');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.pista_auditoria (
        id                  BIGSERIAL               PRIMARY KEY,
        fecha_hora          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
        usuario_id          INTEGER                 NOT NULL,
        usuario_nombre      VARCHAR(150)            NOT NULL,
        accion              accion_auditoria_enum   NOT NULL,
        modulo              VARCHAR(50)             NOT NULL DEFAULT 'COMPRAS',
        tabla_afectada      VARCHAR(100)            NOT NULL,
        registro_id         BIGINT,
        datos_anteriores    JSONB,
        datos_nuevos        JSONB,
        resultado           VARCHAR(10)             NOT NULL DEFAULT 'EXITO',
        descripcion         TEXT,
        ip_address          VARCHAR(45),
        user_agent          VARCHAR(300),
        created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_auditoria_resultado CHECK (resultado IN ('EXITO', 'ERROR'))
      );
    `);
    console.log('Tabla creada');

    await pool.query('CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON public.pista_auditoria(usuario_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_auditoria_fecha_hora ON public.pista_auditoria(fecha_hora)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON public.pista_auditoria(tabla_afectada)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON public.pista_auditoria(accion)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_fecha ON public.pista_auditoria(usuario_id, fecha_hora DESC)');
    console.log('Indices creados');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
