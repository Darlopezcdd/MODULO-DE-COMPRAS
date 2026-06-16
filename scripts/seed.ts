import prisma from '../src/lib/prisma';
import * as bcrypt from 'bcryptjs';

async function main() {
  const adminExists = await prisma.usuarios.findUnique({
    where: { email: 'admin@compras.com' }
  });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.usuarios.create({
      data: {
        nombre: 'Administrador del Sistema',
        email: 'admin@compras.com',
        password: hashedPassword,
        rol: 'ADMIN',
      }
    });
    console.log('Usuario administrador creado: admin@compras.com / admin123');
  } else {
    console.log('Usuario administrador ya existe.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
