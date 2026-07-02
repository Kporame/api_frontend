#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Create mock-server directory
const mockServerDir = path.join(__dirname, 'src', 'mock-server');
if (!fs.existsSync(mockServerDir)) {
  fs.mkdirSync(mockServerDir, { recursive: true });
  console.log('✓ Created mock-server directory');
}

// Create mock-server.service.ts
const serviceContent = `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MockServerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a mock response based on an endpoint's specification
   */
  async generateMockResponse(endpointId: string) {
    const endpoint = await this.prisma.apiEndpoint.findUnique({
      where: { id: endpointId },
      include: {
        document: {
          select: { id: true, projectId: true }
        }
      }
    });

    if (!endpoint) {
      throw new Error(\`Endpoint with ID \${endpointId} not found\`);
    }

    // If there's a predefined response body, use it
    if (endpoint.responseBody) {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(endpoint.responseBody);
        return {
          status: endpoint.responseStatus || 200,
          statusText: this.getStatusText(endpoint.responseStatus || 200),
          headers: {
            'Content-Type': 'application/json',
            'X-Mock-Server': 'true'
          },
          data: parsed
        };
      } catch (e) {
        // If not JSON, return as text
        return {
          status: endpoint.responseStatus || 200,
          statusText: this.getStatusText(endpoint.responseStatus || 200),
          headers: {
            'Content-Type': 'text/plain',
            'X-Mock-Server': 'true'
          },
          data: endpoint.responseBody
        };
      }
    }

    // Generate mock response based on endpoint path and method
    const mockData = this.generateMockDataFromSchema(endpoint);

    return {
      status: endpoint.responseStatus || 200,
      statusText: this.getStatusText(endpoint.responseStatus || 200),
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Server': 'true'
      },
      data: mockData
    };
  }

  /**
   * Get all endpoints for a project with mock enable/disable status
   */
  async getProjectEndpointsWithMockStatus(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new Error(\`Project with ID \${projectId} not found\`);
    }

    // Get the latest document version for this project
    const latestDocument = await this.prisma.apiDocument.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        endpoints: {
          select: {
            id: true,
            method: true,
            path: true,
            title: true,
            description: true,
            responseStatus: true,
            responseBody: true,
            isPublic: true
          }
        }
      }
    });

    if (!latestDocument) {
      return [];
    }

    // Add mock toggle status to each endpoint
    return latestDocument.endpoints.map((endpoint) => ({
      ...endpoint,
      mockEnabled: !!endpoint.responseBody, // Mock is considered enabled if it has a response body
      mockUrl: \`/mock/\${endpoint.id}\`
    }));
  }

  /**
   * Generate intelligent mock data based on the endpoint path and method
   */
  private generateMockDataFromSchema(endpoint: any): any {
    const { path, method } = endpoint;

    // For GET endpoints, return appropriate mock data structure
    if (method === 'GET') {
      // Detect collection endpoints (plural nouns)
      if (path.includes('list') || path.endsWith('s') || path.includes('all')) {
        return this.generateMockCollection(path);
      }

      // Detect single resource endpoints
      if (path.includes('{') || path.includes(':')) {
        return this.generateMockResource(path);
      }

      // Default list response
      return {
        success: true,
        data: [this.generateMockObject(path)],
        total: 1,
        page: 1,
        pageSize: 10
      };
    }

    // For POST endpoints, return created resource
    if (method === 'POST') {
      return {
        success: true,
        message: 'Resource created successfully',
        id: this.generateId(),
        ...this.generateMockObject(path),
        createdAt: new Date().toISOString()
      };
    }

    // For PUT/PATCH endpoints, return updated resource
    if (method === 'PUT' || method === 'PATCH') {
      return {
        success: true,
        message: 'Resource updated successfully',
        id: this.generateId(),
        ...this.generateMockObject(path),
        updatedAt: new Date().toISOString()
      };
    }

    // For DELETE endpoints, return success confirmation
    if (method === 'DELETE') {
      return {
        success: true,
        message: 'Resource deleted successfully',
        id: this.generateId()
      };
    }

    // Default fallback
    return {
      success: true,
      data: this.generateMockObject(path),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate mock collection response
   */
  private generateMockCollection(path: string): any {
    const count = 5;
    const items = [];

    for (let i = 0; i < count; i++) {
      items.push(this.generateMockObject(path));
    }

    return {
      success: true,
      data: items,
      total: count,
      page: 1,
      pageSize: 10,
      hasMore: false
    };
  }

  /**
   * Generate mock single resource
   */
  private generateMockResource(path: string): any {
    return {
      success: true,
      data: this.generateMockObject(path)
    };
  }

  /**
   * Generate mock object with realistic fields based on the path
   */
  private generateMockObject(path: string): any {
    const pathLower = path.toLowerCase();

    // User-related endpoints
    if (pathLower.includes('user')) {
      return {
        id: this.generateId(),
        name: this.generateName(),
        email: this.generateEmail(),
        avatar: \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${this.generateId()}\`,
        createdAt: this.generateDate(),
        updatedAt: this.generateDate(),
        isActive: Math.random() > 0.5
      };
    }

    // Product-related endpoints
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

    // Order-related endpoints
    if (pathLower.includes('order')) {
      return {
        id: this.generateId(),
        orderNumber: Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
        userId: this.generateId(),
        total: Math.floor(Math.random() * 10000) / 100,
        status: this.randomElement(['pending', 'processing', 'shipped', 'delivered']),
        items: [
          {
            id: this.generateId(),
            name: this.generateProductName(),
            quantity: Math.floor(Math.random() * 10) + 1,
            price: Math.floor(Math.random() * 1000) / 100
          }
        ],
        createdAt: this.generateDate(),
        updatedAt: this.generateDate()
      };
    }

    // Invoice-related endpoints
    if (pathLower.includes('invoice')) {
      return {
        id: this.generateId(),
        invoiceNumber: Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
        customerId: this.generateId(),
        amount: Math.floor(Math.random() * 100000) / 100,
        status: this.randomElement(['draft', 'sent', 'paid', 'overdue']),
        issueDate: this.generateDate(),
        dueDate: this.generateDate(),
        createdAt: this.generateDate(),
        updatedAt: this.generateDate()
      };
    }

    // Article/Post-related endpoints
    if (pathLower.includes('article') || pathLower.includes('post') || pathLower.includes('blog')) {
      return {
        id: this.generateId(),
        title: 'Sample Article Title: ' + Math.random().toString(36).substring(7),
        slug: 'sample-article-' + Math.random().toString(36).substring(7),
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        author: this.generateName(),
        tags: ['sample', 'mock', 'data'],
        views: Math.floor(Math.random() * 10000),
        likes: Math.floor(Math.random() * 1000),
        createdAt: this.generateDate(),
        updatedAt: this.generateDate(),
        publishedAt: this.generateDate()
      };
    }

    // Team-related endpoints
    if (pathLower.includes('team')) {
      return {
        id: this.generateId(),
        name: 'Team ' + Math.random().toString(36).substring(7),
        description: this.generateDescription(),
        memberCount: Math.floor(Math.random() * 100) + 1,
        createdAt: this.generateDate(),
        updatedAt: this.generateDate()
      };
    }

    // Project-related endpoints
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

    // Default generic object
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
    return \`user\${Math.floor(Math.random() * 10000)}@example.com\`;
  }

  private generateProductName(): string {
    const products = ['Widget', 'Gadget', 'Tool', 'Device', 'Appliance', 'Instrument', 'Apparatus'];
    const colors = ['Red', 'Blue', 'Green', 'Black', 'White', 'Silver', 'Gold'];
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

  /**
   * Get HTTP status text
   */
  private getStatusText(status: number | string): string {
    const statusCode = parseInt(status as string);
    const statusMap: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };

    return statusMap[statusCode] || 'Unknown';
  }
}
`;

fs.writeFileSync(path.join(mockServerDir, 'mock-server.service.ts'), serviceContent);
console.log('✓ Created mock-server.service.ts');

// Create mock-server.controller.ts
const controllerContent = `import { Controller, Get, Param } from '@nestjs/common';
import { MockServerService } from './mock-server.service';

@Controller('mock')
export class MockServerController {
  constructor(private readonly mockServerService: MockServerService) {}

  /**
   * GET /mock/:endpointId
   * Generate mock response for a specific endpoint
   */
  @Get(':endpointId')
  async generateMockResponse(@Param('endpointId') endpointId: string) {
    return this.mockServerService.generateMockResponse(endpointId);
  }

  /**
   * GET /mock/project/:projectId/endpoints
   * List all endpoints for a project with mock enable/disable status
   */
  @Get('project/:projectId/endpoints')
  async getProjectEndpointsWithMockStatus(@Param('projectId') projectId: string) {
    return this.mockServerService.getProjectEndpointsWithMockStatus(projectId);
  }
}
`;

fs.writeFileSync(path.join(mockServerDir, 'mock-server.controller.ts'), controllerContent);
console.log('✓ Created mock-server.controller.ts');

// Create mock-server.module.ts
const moduleContent = `import { Module } from '@nestjs/common';
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
`;

fs.writeFileSync(path.join(mockServerDir, 'mock-server.module.ts'), moduleContent);
console.log('✓ Created mock-server.module.ts');

console.log('\\n✓ Mock-server module created successfully!');
`;
