import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const facturasDb = await prisma.facturas_compra.findMany({
      orderBy: { fecha: 'desc' }
    });
    console.log("findMany facturas_compra success! count:", facturasDb.length);

    const proveedoresIds = Array.from(new Set(facturasDb.map(f => f.proveedor_id)));
    const proveedores = await prisma.proveedor.findMany({
      where: { id: { in: proveedoresIds } }
    });
    console.log("findMany proveedor success! count:", proveedores.length);

    const proveedorMap = Object.fromEntries(proveedores.map(p => [p.id, p.nombre]));

    const facturasList = facturasDb.map(f => ({
      id: f.id.toString(),
      proveedor: proveedorMap[f.proveedor_id] || 'Desconocido',
      fecha: f.fecha.toISOString().split('T')[0],
      total: `$${Number(f.total).toFixed(2)}`,
      estado: f.estado || 'PENDIENTE'
    }));

    console.log("Mapped success:", facturasList.slice(0, 2));
  } catch (e: any) {
    console.error("ERROR:", e);
    console.error("ERROR MESSAGE:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
