const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Regenerating Prisma Client...');
  
  // Use Prisma generate command
  const prismaPath = path.join(__dirname, 'node_modules', '.bin', 'prisma');
  const cmd = `"${prismaPath}" generate`;
  
  console.log('Running:', cmd);
  const output = execSync(cmd, { 
    encoding: 'utf-8',
    stdio: 'inherit',
    cwd: __dirname
  });
  
  console.log('✅ Prisma Client regenerated successfully!');
} catch (error) {
  console.error('❌ Error regenerating Prisma:', error.message);
  process.exit(1);
}
