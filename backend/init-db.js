const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database initialization...');
    
    // Create a sample team
    const team = await prisma.team.create({
      data: {
        name: 'Default Team',
        description: 'Default team for testing'
      }
    });
    console.log('✓ Team created:', team.id);

    // Create a sample user (ADMIN)
    const user = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'ADMIN',
        teamId: team.id
      }
    });
    console.log('✓ Admin user created:', user.email);

    // Create a sample project
    const project = await prisma.project.create({
      data: {
        name: 'Sample API Project',
        description: 'A sample project for API documentation',
        visibility: 'PUBLIC',
        teamId: team.id
      }
    });
    console.log('✓ Project created:', project.id);

    // Create a sample API document
    const document = await prisma.apiDocument.create({
      data: {
        projectId: project.id,
        version: '1.0.0',
        rawFile: JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Sample API', version: '1.0.0' },
          paths: {}
        })
      }
    });
    console.log('✓ API document created:', document.id);

    console.log('\n✅ Database initialization completed successfully!');
    console.log('\nTest user credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Error during database initialization:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
