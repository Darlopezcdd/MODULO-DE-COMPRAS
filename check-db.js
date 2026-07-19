const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.pista_auditoria.findMany({orderBy: {fecha_hora: 'desc'}, take: 5}).then(console.log).finally(() => prisma.$disconnect());
