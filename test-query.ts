import prisma from './src/lib/prisma';
async function run() {
  try {
    const facturas = await prisma.$queryRaw`
      SELECT f.numero_factura, f.fecha, p.nombre as proveedor_nombre, f.total 
      FROM facturas_compra f 
      LEFT JOIN "Proveedor" p ON f.proveedor_id = p.id
      ORDER BY f.fecha DESC
      LIMIT 200
    ` as any[];
    console.log("Success! Found:", facturas.length);
  } catch(e) {
    console.error("Query failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
