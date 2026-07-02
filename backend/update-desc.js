const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.project.updateMany({
    data: {
      name: 'Smart Carpark API',
      description: 'Current API contract for the Smart Carpark backend.\nAdmin endpoints use Bearer access tokens. Device endpoints use X-Device-Id plus X-Device-Token, or Authorization: Device <token>.'
    }
  });
  console.log('Project updated successfully.');
}

main().finally(() => prisma.$disconnect());
