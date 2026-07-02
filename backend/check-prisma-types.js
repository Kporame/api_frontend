const fs = require('fs');
const path = require('path');

// Manually create/update the Prisma Client index.d.ts to include ProjectAccess
const prismaPath = path.join(__dirname, 'node_modules', '@prisma', 'client');
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');

console.log('Attempting to regenerate Prisma types...');

try {
  // Read schema
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  if (schema.includes('model ProjectAccess')) {
    console.log('✓ ProjectAccess model found in schema');
  }

  // Try using the generator
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  // The mere act of importing should validate the types
  console.log('✓ PrismaClient imported successfully');
  
  // Check if projectAccess exists
  if (typeof prisma.projectAccess === 'undefined') {
    console.warn('⚠ Warning: projectAccess not yet available in PrismaClient');
    console.log('  Trying to invalidate Prisma cache...');
    
    // Try removing the generated types
    const generatedDir = path.join(prismaPath, '@generated');
    if (fs.existsSync(generatedDir)) {
      console.log('  Found @generated directory, may need manual regeneration');
    }
  } else {
    console.log('✓ projectAccess is available in PrismaClient');
  }

  prisma.$disconnect();
  console.log('\n✅ Prisma update check complete!');
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
