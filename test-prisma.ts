import 'dotenv/config';
import prisma from './src/lib/prisma';

async function main() {
  try {
    const gastos = await prisma.gastos_cxc.findMany({
      where: { sincronizado: false },
      orderBy: { fecha_pago: 'desc' }
    });
    console.log(`Found ${gastos.length} gastos.`);
    
    if (gastos.length > 0) {
      const ids = gastos.map((g: any) => g.id);
      console.log('Ids to update:', ids);
      const updated = await prisma.gastos_cxc.updateMany({
        where: { id: { in: ids } },
        data: { sincronizado: true }
      });
      console.log(`Updated ${updated.count} gastos.`);
    }
  } catch (error) {
    console.error("PRISMA ERROR:", error);
  }
}

main().finally(() => prisma.$disconnect());
