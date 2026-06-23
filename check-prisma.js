require('ts-node').register();
const prisma = require('./src/lib/prisma.ts').default;
console.log(Object.keys(prisma).filter(k => !k.startsWith('_')));
