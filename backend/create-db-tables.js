const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

try {
  console.log('Creating database tables...');

  // Create tables based on schema.prisma
  const commands = [
    `CREATE TABLE IF NOT EXISTS "Team" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'GUEST',
      "teamId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS "Project" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "githubUrl" TEXT,
      "domainUrl" TEXT,
      "documentUrl" TEXT,
      "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
      "teamId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS "ProjectAccess" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'VIEWER',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS "ApiDocument" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "fileName" TEXT NOT NULL DEFAULT 'document',
      "fileType" TEXT NOT NULL DEFAULT 'unknown',
      "version" TEXT NOT NULL DEFAULT '1.0.0',
      "rawFile" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS "ApiEndpoint" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "documentId" TEXT NOT NULL,
      "method" TEXT NOT NULL,
      "path" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "requestHeaders" TEXT,
      "requestBody" TEXT,
      "responseBody" TEXT,
      "responseStatus" TEXT,
      "isPublic" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      FOREIGN KEY ("documentId") REFERENCES "ApiDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT,
      "action" TEXT NOT NULL,
      "endpointPath" TEXT,
      "requestUrl" TEXT,
      "requestMethod" TEXT,
      "requestBody" TEXT,
      "responseStatus" INTEGER,
      "responseTime" INTEGER,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "details" TEXT,
      "isMasked" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  db.exec('PRAGMA foreign_keys = ON');

  for (const cmd of commands) {
    db.exec(cmd);
    console.log('✓ Table created');
  }

  console.log('\n✅ Database schema created successfully!');
  db.close();

} catch (error) {
  console.error('❌ Error creating tables:', error.message);
  process.exit(1);
}
