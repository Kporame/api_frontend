const fs = require('fs');
const path = require('path');

const mockServerDir = path.join(__dirname, 'mock-server');
console.log('Creating directory at:', mockServerDir);

try {
  // Ensure directory exists
  if (!fs.existsSync(mockServerDir)) {
    fs.mkdirSync(mockServerDir, { recursive: true });
    console.log('Directory created successfully');
  } else {
    console.log('Directory already exists');
  }
  
  // Create mock-server.service.ts
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

  // Create mock-server.controller.ts
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

  // Create mock-server.module.ts
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
  fs.writeFileSync(path.join(mockServerDir, 'mock-server.service.ts'), serviceContent);
  console.log('Created: mock-server.service.ts');
  
  fs.writeFileSync(path.join(mockServerDir, 'mock-server.controller.ts'), controllerContent);
  console.log('Created: mock-server.controller.ts');
  
  fs.writeFileSync(path.join(mockServerDir, 'mock-server.module.ts'), moduleContent);
  console.log('Created: mock-server.module.ts');
  
  // Check if directory was created
  if (fs.existsSync(mockServerDir)) {
    console.log('Verified: Directory exists');
    console.log('Directory contents:', fs.readdirSync(mockServerDir));
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
