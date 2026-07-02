#!/usr/bin/env node
/**
 * Setup mock-server module files
 * Run from project root: node backend/final-setup.js
 */
const fs = require('fs');
const path = require('path');

function main() {
  const backendDir = __dirname;
  const srcDir = path.join(backendDir, 'src');
  const mockServerDir = path.join(srcDir, 'mock-server');

  console.log('Setting up mock-server module...');
  console.log('Backend dir:', backendDir);
  console.log('Mock-server dir:', mockServerDir);

  // Create directory
  try {
    if (!fs.existsSync(mockServerDir)) {
      fs.mkdirSync(mockServerDir, { recursive: true });
      console.log('✓ Created mock-server directory');
    }
  } catch (error) {
    console.error('✗ Failed to create directory:', error.message);
    process.exit(1);
  }

  // Create service file
  const serviceContent = `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MockServerService {
  constructor(private readonly prisma: PrismaService) {}

  async generateMockResponse(endpointId: string) {
    const endpoint = await this.prisma.apiEndpoint.findUnique({
      where: { id: endpointId },
      include: { document: { select: { id: true, projectId: true } } }
    });

    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    if (endpoint.responseBody) {
      try {
        const parsed = JSON.parse(endpoint.responseBody);
        return {
          status: endpoint.responseStatus || 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json', 'X-Mock-Server': 'true' },
          data: parsed
        };
      } catch (e) {
        return {
          status: endpoint.responseStatus || 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'text/plain', 'X-Mock-Server': 'true' },
          data: endpoint.responseBody
        };
      }
    }

    const mockData = this.generateMockDataFromSchema(endpoint);
    return {
      status: endpoint.responseStatus || 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json', 'X-Mock-Server': 'true' },
      data: mockData
    };
  }

  private generateMockDataFromSchema(endpoint: any): any {
    const { path, method } = endpoint;

    if (method === 'GET') {
      if (path.includes('list') || path.endsWith('s')) {
        return this.generateMockCollection(path);
      }
      return { success: true, data: this.generateMockObject(path) };
    }

    if (method === 'POST') {
      return { success: true, message: 'Created', id: this.generateId(), ...this.generateMockObject(path) };
    }

    if (method === 'PUT' || method === 'PATCH') {
      return { success: true, message: 'Updated', id: this.generateId(), ...this.generateMockObject(path) };
    }

    if (method === 'DELETE') {
      return { success: true, message: 'Deleted', id: this.generateId() };
    }

    return { success: true, data: this.generateMockObject(path) };
  }

  private generateMockCollection(path: string): any {
    const items = [this.generateMockObject(path), this.generateMockObject(path), this.generateMockObject(path)];
    return { success: true, data: items, total: items.length };
  }

  private generateMockObject(path: string): any {
    return {
      id: this.generateId(),
      name: 'Item ' + this.generateId().substring(0, 8),
      description: 'Mock data for ' + path,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
`;

  // Create controller file
  const controllerContent = `import { Controller, Get, Param, BadRequestException } from '@nestjs/common';
import { MockServerService } from './mock-server.service';

@Controller('mock')
export class MockServerController {
  constructor(private readonly mockService: MockServerService) {}

  @Get(':endpointId')
  async getMockResponse(@Param('endpointId') endpointId: string) {
    try {
      return await this.mockService.generateMockResponse(endpointId);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
`;

  // Create module file
  const moduleContent = `import { Module } from '@nestjs/common';
import { MockServerController } from './mock-server.controller';
import { MockServerService } from './mock-server.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MockServerController],
  providers: [MockServerService],
  exports: [MockServerService]
})
export class MockServerModule {}
`;

  // Write files
  try {
    fs.writeFileSync(path.join(mockServerDir, 'mock-server.service.ts'), serviceContent);
    console.log('✓ Created mock-server.service.ts');

    fs.writeFileSync(path.join(mockServerDir, 'mock-server.controller.ts'), controllerContent);
    console.log('✓ Created mock-server.controller.ts');

    fs.writeFileSync(path.join(mockServerDir, 'mock-server.module.ts'), moduleContent);
    console.log('✓ Created mock-server.module.ts');

    console.log('\n✓ Mock-server module created successfully!');
    console.log('\nNext steps:');
    console.log('1. The MockServerModule has been added to app.module.ts');
    console.log('2. Build the project: npm run build');
    console.log('3. Start the server: npm run start:dev');
  } catch (error) {
    console.error('✗ Error writing files:', error.message);
    process.exit(1);
  }
}

main();
