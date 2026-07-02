const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    await p.$connect();
    const keys = Object.keys(p).sort();
    console.log('PRISMA KEYS:', keys.join(', '));
    console.log('has projectAccess:', Object.prototype.hasOwnProperty.call(p, 'projectAccess'));
    console.log('typeof projectAccess:', typeof p.projectAccess);
  } catch (e) {
    console.error('ERROR', e && e.stack ? e.stack : e);
  } finally {
    await p.$disconnect();
  }
})();
