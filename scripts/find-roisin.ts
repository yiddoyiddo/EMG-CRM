import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function searchForRoisin() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Roisin', mode: 'insensitive' } },
        { name: { contains: 'Brennand', mode: 'insensitive' } },
        { email: { contains: 'roisin', mode: 'insensitive' } },
        { email: { contains: 'brennand', mode: 'insensitive' } }
      ]
    },
    select: { name: true, email: true, role: true }
  });
  
  console.log('Search results for Roisin Brennand:');
  if (users.length === 0) {
    console.log('❌ No matching users found. Account needs to be created.');
  } else {
    users.forEach(u => console.log(`✅ Found: ${u.name} (${u.email}) - ${u.role}`));
  }
  
  await prisma.$disconnect();
}

searchForRoisin().catch(console.error);