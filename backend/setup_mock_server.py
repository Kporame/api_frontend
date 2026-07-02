#!/usr/bin/env python3
"""
Setup script to create mock-server module files
Run from backend directory: python setup_mock_server.py
"""

import os
import sys
from pathlib import Path

def create_mock_server_module():
    """Create the mock-server module with all necessary files."""
    
    # Get the src directory
    backend_dir = Path(__file__).parent
    src_dir = backend_dir / 'src'
    mock_server_dir = src_dir / 'mock-server'
    
    print(f"Backend directory: {backend_dir}")
    print(f"Source directory: {src_dir}")
    print(f"Mock-server directory: {mock_server_dir}")
    
    # Create directory
    try:
        mock_server_dir.mkdir(parents=True, exist_ok=True)
        print(f"✓ Created directory: {mock_server_dir}")
    except Exception as e:
        print(f"✗ Failed to create directory: {e}")
        return False

    # File 1: mock-server.service.ts
    service_content = '''import { Injectable } from '@nestjs/common';
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
      throw new Error(`Endpoint with ID ${endpointId} not found`);
    }

    if (endpoint.responseBody) {
      try {
        const parsed = JSON.parse(endpoint.responseBody);
        return {
          status: endpoint.responseStatus || 200,
          statusText: this.getStatusText(endpoint.responseStatus || 200),
          headers: { 'Content-Type': 'application/json', 'X-Mock-Server': 'true' },
          data: parsed
        };
      } catch (e) {
        return {
          status: endpoint.responseStatus || 200,
          statusText: this.getStatusText(endpoint.responseStatus || 200),
          headers: { 'Content-Type': 'text/plain', 'X-Mock-Server': 'true' },
          data: endpoint.responseBody
        };
      }
    }

    const mockData = this.generateMockDataFromSchema(endpoint);
    return {
      status: endpoint.responseStatus || 200,
      statusText: this.getStatusText(endpoint.responseStatus || 200),
      headers: { 'Content-Type': 'application/json', 'X-Mock-Server': 'true' },
      data: mockData
    };
  }

  async getProjectEndpointsWithMockStatus(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    const latestDocument = await this.prisma.apiDocument.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        endpoints: {
          select: {
            id: true, method: true, path: true, title: true, description: true,
            responseStatus: true, responseBody: true, isPublic: true
          }
        }
      }
    });

    if (!latestDocument) return [];

    return latestDocument.endpoints.map((endpoint) => ({
      ...endpoint,
      mockEnabled: !!endpoint.responseBody,
      mockUrl: `/mock/${endpoint.id}`
    }));
  }

  private generateMockDataFromSchema(endpoint: any): any {
    const { path, method } = endpoint;

    if (method === 'GET') {
      if (path.includes('list') || path.endsWith('s') || path.includes('all')) {
        return this.generateMockCollection(path);
      }
      if (path.includes('{') || path.includes(':')) {
        return this.generateMockResource(path);
      }
      return { success: true, data: [this.generateMockObject(path)], total: 1, page: 1, pageSize: 10 };
    }

    if (method === 'POST') {
      return { success: true, message: 'Resource created successfully', id: this.generateId(), ...this.generateMockObject(path), createdAt: new Date().toISOString() };
    }

    if (method === 'PUT' || method === 'PATCH') {
      return { success: true, message: 'Resource updated successfully', id: this.generateId(), ...this.generateMockObject(path), updatedAt: new Date().toISOString() };
    }

    if (method === 'DELETE') {
      return { success: true, message: 'Resource deleted successfully', id: this.generateId() };
    }

    return { success: true, data: this.generateMockObject(path), timestamp: new Date().toISOString() };
  }

  private generateMockCollection(path: string): any {
    const count = 5;
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(this.generateMockObject(path));
    }
    return { success: true, data: items, total: count, page: 1, pageSize: 10, hasMore: false };
  }

  private generateMockResource(path: string): any {
    return { success: true, data: this.generateMockObject(path) };
  }

  private generateMockObject(path: string): any {
    const pathLower = path.toLowerCase();

    if (pathLower.includes('user')) {
      return {
        id: this.generateId(),
        name: this.generateName(),
        email: this.generateEmail(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.generateId()}`,
        createdAt: this.generateDate(),
        updatedAt: this.generateDate(),
        isActive: Math.random() > 0.5
      };
    }

    if (pathLower.includes('product')) {
      return {
        id: this.generateId(),
        name: this.generateProductName(),
        description: this.generateDescription(),
        price: Math.floor(Math.random() * 1000) / 100,
        currency: 'USD',
        inStock: Math.random() > 0.3,
        sku: this.generateSku(),
        createdAt: this.generateDate(),
        updatedAt: this.generateDate()
      };
    }

    if (pathLower.includes('project')) {
      return {
        id: this.generateId(),
        name: 'Project ' + Math.random().toString(36).substring(7),
        description: this.generateDescription(),
        status: this.randomElement(['active', 'completed', 'archived']),
        progress: Math.floor(Math.random() * 100),
        createdAt: this.generateDate(),
        updatedAt: this.generateDate()
      };
    }

    return {
      id: this.generateId(),
      name: 'Item ' + Math.random().toString(36).substring(7),
      description: this.generateDescription(),
      status: this.randomElement(['active', 'inactive', 'pending']),
      value: Math.floor(Math.random() * 1000),
      createdAt: this.generateDate(),
      updatedAt: this.generateDate()
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private generateName(): string {
    const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'];
    const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    return names[Math.floor(Math.random() * names.length)] + ' ' + surnames[Math.floor(Math.random() * surnames.length)];
  }

  private generateEmail(): string {
    return `user${Math.floor(Math.random() * 10000)}@example.com`;
  }

  private generateProductName(): string {
    const products = ['Widget', 'Gadget', 'Tool', 'Device', 'Appliance'];
    const colors = ['Red', 'Blue', 'Green', 'Black', 'White'];
    return colors[Math.floor(Math.random() * colors.length)] + ' ' + products[Math.floor(Math.random() * products.length)];
  }

  private generateDescription(): string {
    return 'This is a sample description for a mock object. Lorem ipsum dolor sit amet.';
  }

  private generateSku(): string {
    return 'SKU-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  private generateDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    return date.toISOString();
  }

  private randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private getStatusText(status: number | string): string {
    const statusCode = parseInt(status as string);
    const statusMap: Record<number, string> = {
      200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized',
      403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 422: 'Unprocessable Entity',
      429: 'Too Many Requests', 500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway', 503: 'Service Unavailable'
    };
    return statusMap[statusCode] || 'Unknown';
  }
}
'''

    try:
        (mock_server_dir / 'mock-server.service.ts').write_text(service_content)
        print("✓ Created mock-server.service.ts")
    except Exception as e:
        print(f"✗ Failed to create mock-server.service.ts: {e}")
        return False

    # File 2: mock-server.controller.ts
    controller_content = '''import { Controller, Get, Param } from '@nestjs/common';
import { MockServerService } from './mock-server.service';

@Controller('mock')
export class MockServerController {
  constructor(private readonly mockServerService: MockServerService) {}

  @Get(':endpointId')
  async generateMockResponse(@Param('endpointId') endpointId: string) {
    return this.mockServerService.generateMockResponse(endpointId);
  }

  @Get('project/:projectId/endpoints')
  async getProjectEndpointsWithMockStatus(@Param('projectId') projectId: string) {
    return this.mockServerService.getProjectEndpointsWithMockStatus(projectId);
  }
}
'''

    try:
        (mock_server_dir / 'mock-server.controller.ts').write_text(controller_content)
        print("✓ Created mock-server.controller.ts")
    except Exception as e:
        print(f"✗ Failed to create mock-server.controller.ts: {e}")
        return False

    # File 3: mock-server.module.ts
    module_content = '''import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MockServerService } from './mock-server.service';
import { MockServerController } from './mock-server.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MockServerController],
  providers: [MockServerService],
  exports: [MockServerService]
})
export class MockServerModule {}
'''

    try:
        (mock_server_dir / 'mock-server.module.ts').write_text(module_content)
        print("✓ Created mock-server.module.ts")
    except Exception as e:
        print(f"✗ Failed to create mock-server.module.ts: {e}")
        return False

    print("\n✅ Mock-server module created successfully!")
    print("\nNext steps:")
    print("1. Update backend/src/app.module.ts to import MockServerModule")
    print("2. Run: npm run build")
    print("3. Run: npm run start:dev")
    
    return True

if __name__ == '__main__':
    success = create_mock_server_module()
    sys.exit(0 if success else 1)
