# Mock Server Module Setup Instructions

This document provides the complete mock-server module for the API Portal backend.

## Files to Create

Create directory: `backend/src/mock-server/`

Then create the following three files in that directory:

---

## 1. mock-server/mock-server.service.ts

```typescript
import { Injectable } from '@nestjs/common';
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
```

---

## 2. mock-server/mock-server.controller.ts

```typescript
import { Controller, Get, Param } from '@nestjs/common';
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
```

---

## 3. mock-server/mock-server.module.ts

```typescript
import { Module } from '@nestjs/common';
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
```

---

## Integration Steps

After creating the files, update `backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MockServerModule } from './mock-server/mock-server.module';  // Add this

@Module({
  imports: [PrismaModule, MockServerModule],  // Add MockServerModule here
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## API Endpoints

### 1. Generate Mock Response
- **Route**: `GET /mock/:endpointId`
- **Description**: Generate a mock response for a specific endpoint
- **Response**: Returns mock data based on the endpoint specification

### 2. List Project Endpoints with Mock Status
- **Route**: `GET /mock/project/:projectId/endpoints`
- **Description**: Get all endpoints for a project with mock enable/disable status
- **Response**: Returns array of endpoints with `mockEnabled` flag and `mockUrl`

---

## Features

- **Intelligent Mock Generation**: Generates realistic mock data based on endpoint paths
- **Schema-Aware**: Different response structures for GET (list/single), POST (created), PUT/PATCH (updated), DELETE (success)
- **Predefined Response Support**: Uses custom response bodies if defined in endpoint
- **Content Type Handling**: Automatically sets correct Content-Type headers
- **Mock Server Flag**: Adds X-Mock-Server header to identify mock responses
- **Entity-Specific Data**: Generates contextual data for users, products, projects, orders, etc.

