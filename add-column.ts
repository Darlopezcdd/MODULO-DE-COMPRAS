import 'dotenv/config';
import prisma from './src/lib/prisma';

async function main() {
  try {
    console.log("Adding column...");
    await prisma.$executeRaw`ALTER TABLE "gastos_cxc" ADD COLUMN IF NOT EXISTS "sincronizado" BOOLEAN NOT NULL DEFAULT false;`;
    console.log("Column added successfully!");
    
    console.log("Updating existing records to true...");
    await prisma.$executeRaw`UPDATE "gastos_cxc" SET "sincronizado" = true WHERE "sincronizado" = false;`;
    console.log("Updated!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
