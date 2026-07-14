const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.xugrbubhckwzgugpxtoi:Compras123.@aws-1-us-west-2.pooler.supabase.com:5432/postgres';
const pool = new Pool({ connectionString });

async function stressTest() {
  console.log('--- INICIANDO PRUEBA DE RENDIMIENTO Y ESTRÉS ---');
  console.log('Conectando a la base de datos...');
  
  const client = await pool.connect();
  
  try {
    // 1. Limpieza inicial por si acaso quedaron registros huérfanos de pruebas previas
    await client.query("DELETE FROM public.facturas_compra WHERE observaciones = 'STRESS_TEST'");
    await client.query("DELETE FROM public.proveedores WHERE direccion = 'STRESS_TEST_DIR'");

    console.log('Insertando datos mock masivos para estrés (2,000 proveedores y 2,000 facturas)...');
    
    // Insertar proveedores en lote
    const numRecords = 2000;
    const provQueries = [];
    console.time('Tiempo de inserción de proveedores');
    
    // Generar consultas batch
    for (let i = 0; i < numRecords; i += 100) {
      const values = [];
      const sliceSize = Math.min(100, numRecords - i);
      for (let j = 0; j < sliceSize; j++) {
        const id = i + j;
        const ruc = `999${String(id).padStart(10, '0')}`;
        const nombre = `Proveedor Stress Test ${id} de UTN`;
        const ciudad = id % 2 === 0 ? 'Ibarra' : 'Quito';
        const tipo = id % 3 === 0 ? 'CREDITO' : 'CONTADO';
        values.push(`('${ruc}', '${nombre}', '${ciudad}', '${tipo}', 'STRESS_TEST_DIR', '0999999999', 'stress${id}@utn.edu.ec', 'ACTIVO', 1, NOW(), NOW())`);
      }
      await client.query(`
        INSERT INTO public.proveedores (cedula_ruc, nombre, ciudad, tipo_proveedor, direccion, telefono, email, estado, created_by, created_at, updated_at)
        VALUES ${values.join(',')}
      `);
    }
    console.timeEnd('Tiempo de inserción de proveedores');
    
    // Obtener los ids insertados
    const { rows: provRows } = await client.query("SELECT id FROM public.proveedores WHERE direccion = 'STRESS_TEST_DIR' LIMIT 2000");
    const provIds = provRows.map(r => r.id);
    
    // Insertar facturas en lote
    console.time('Tiempo de inserción de facturas');
    for (let i = 0; i < numRecords; i += 100) {
      const values = [];
      const sliceSize = Math.min(100, numRecords - i);
      for (let j = 0; j < sliceSize; j++) {
        const id = i + j;
        const provId = provIds[id % provIds.length];
        const tipoPago = id % 2 === 0 ? 'CREDITO' : 'CONTADO';
        const estado = id % 5 === 0 ? 'BORRADOR' : 'EMITIDA';
        const total = 50 + (id % 1000);
        values.push(`(NOW(), ${provId}, '${tipoPago}', ${total}, '${estado}', FALSE, 'STRESS_TEST', 1, NOW(), NOW())`);
      }
      await client.query(`
        INSERT INTO public.facturas_compra (fecha, proveedor_id, tipo_pago, total, estado, pdf_generado, observaciones, created_by, created_at, updated_at)
        VALUES ${values.join(',')}
      `);
    }
    console.timeEnd('Tiempo de inserción de facturas');

    console.log('\n--- REALIZANDO CONSULTAS DE ESTRÉS (TIEMPOS DE RESPUESTA) ---');
    
    // 1. Búsqueda fuzzy por nombre de proveedor (Usando GIN Trigram index)
    console.time('1. Búsqueda fuzzy de proveedor por nombre ("UTN")');
    const { rows: fuzzyRes } = await client.query("SELECT * FROM public.proveedores WHERE nombre ILIKE '%UTN%' LIMIT 50");
    console.timeEnd('1. Búsqueda fuzzy de proveedor por nombre ("UTN")');
    console.log(`   Resultados encontrados: ${fuzzyRes.length}`);

    // 2. Búsqueda por RUC exacto
    const targetRuc = `9990000000500`;
    console.time('2. Búsqueda de proveedor por RUC exacto (UQ Index)');
    const { rows: rucRes } = await client.query("SELECT * FROM public.proveedores WHERE cedula_ruc = $1", [targetRuc]);
    console.timeEnd('2. Búsqueda de proveedor por RUC exacto (UQ Index)');
    console.log(`   Resultados encontrados: ${rucRes.length}`);

    // 3. Filtrado de facturas por rango de fecha y paginación
    console.time('3. Consulta paginada de facturas con ordenamiento (Filtro fecha)');
    const { rows: factRes } = await client.query(`
      SELECT f.*, p.nombre as proveedor_nombre 
      FROM public.facturas_compra f
      JOIN public.proveedores p ON f.proveedor_id = p.id
      WHERE f.fecha >= NOW() - INTERVAL '1 day'
      ORDER BY f.fecha DESC
      LIMIT 20 OFFSET 100
    `);
    console.timeEnd('3. Consulta paginada de facturas con ordenamiento (Filtro fecha)');
    console.log(`   Resultados en página: ${factRes.length}`);

    // 4. Búsqueda fuzzy de facturas por nombre de proveedor en JOIN
    console.time('4. Búsqueda compleja: Facturas por nombre de proveedor ("UTN")');
    const { rows: joinRes } = await client.query(`
      SELECT f.*, p.nombre as proveedor_nombre 
      FROM public.facturas_compra f
      JOIN public.proveedores p ON f.proveedor_id = p.id
      WHERE p.nombre ILIKE '%UTN%'
      LIMIT 50
    `);
    console.timeEnd('4. Búsqueda compleja: Facturas por nombre de proveedor ("UTN")');
    console.log(`   Resultados encontrados: ${joinRes.length}`);

    console.log('\nLimpiando datos mock de la base de datos...');
    console.time('Tiempo de limpieza de datos');
    await client.query("DELETE FROM public.facturas_compra WHERE observaciones = 'STRESS_TEST'");
    await client.query("DELETE FROM public.proveedores WHERE direccion = 'STRESS_TEST_DIR'");
    console.timeEnd('Tiempo de limpieza de datos');
    
    console.log('\n--- PRUEBA FINALIZADA CON ÉXITO ---');
  } catch (err) {
    console.error('Error durante la prueba de estrés:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

stressTest();
