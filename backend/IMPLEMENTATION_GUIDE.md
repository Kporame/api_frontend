# Mock-Server Module Implementation Guide

## Summary

I've created helper scripts and documentation to set up the mock-server module for your API Portal backend. Due to environment limitations, I've provided multiple options for setup.

## Files Already Created

1. **setup_mock_server.py** - Python setup script that creates all three module files
2. **create-mock-server.js** - Node.js setup script (alternative)
3. **MOCK_SERVER_SETUP.md** - Complete documentation with all file contents

## Quick Setup (Choose One Method)

### Method 1: Using Python (Recommended)
```bash
cd backend
python setup_mock_server.py
```

### Method 2: Using Node.js
```bash
cd backend
node create-mock-server.js
```

### Method 3: Manual Creation
Follow the instructions in MOCK_SERVER_SETUP.md to manually create:
- `src/mock-server/mock-server.service.ts`
- `src/mock-server/mock-server.controller.ts`
- `src/mock-server/mock-server.module.ts`

## Manual File Creation Instructions

If you need to manually create the files:

1. Create directory: `backend/src/mock-server/`

2. Copy the content from MOCK_SERVER_SETUP.md into three files:
   - `mock-server.service.ts` - Service for generating mock responses
   - `mock-server.controller.ts` - Controller with two endpoints
   - `mock-server.module.ts` - NestJS module definition

3. Update `backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MockServerModule } from './mock-server/mock-server.module';  // Add this line

@Module({
  imports: [PrismaModule, MockServerModule],  // Add MockServerModule here
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Module Structure

### MockServerService
**Location**: `src/mock-server/mock-server.service.ts`

**Methods**:
- `generateMockResponse(endpointId: string)` - Generates mock response for a specific endpoint
- `getProjectEndpointsWithMockStatus(projectId: string)` - Gets all project endpoints with mock status

**Features**:
- Intelligent mock data generation based on endpoint paths
- Context-aware responses (users, products, projects, orders, etc.)
- Support for predefined response bodies
- Automatic content-type detection (JSON/text)
- HTTP status code mapping

### MockServerController
**Location**: `src/mock-server/mock-server.controller.ts`

**Endpoints**:
- `GET /mock/:endpointId` - Generate mock response for specific endpoint
- `GET /mock/project/:projectId/endpoints` - List endpoints with mock status

### MockServerModule
**Location**: `src/mock-server/mock-server.module.ts`

- Imports PrismaModule for database access
- Exports MockServerService for other modules
- Registers controller and service with NestJS

## API Usage Examples

### 1. Generate Mock Response
```bash
GET /mock/endpoint-id-123

Response:
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "Content-Type": "application/json",
    "X-Mock-Server": "true"
  },
  "data": {
    "id": "abc123",
    "name": "Item abc",
    "description": "This is a sample description...",
    "status": "active",
    "value": 42,
    "createdAt": "2024-12-15T10:30:00Z",
    "updatedAt": "2024-12-16T12:00:00Z"
  }
}
```

### 2. List Project Endpoints with Mock Status
```bash
GET /mock/project/project-id-456/endpoints

Response:
[
  {
    "id": "endpoint-1",
    "method": "GET",
    "path": "/users",
    "title": "Get Users",
    "description": "Retrieve all users",
    "responseStatus": "200",
    "responseBody": "...",
    "isPublic": true,
    "mockEnabled": true,
    "mockUrl": "/mock/endpoint-1"
  },
  ...
]
```

## Mock Data Generation Examples

The service generates contextual mock data based on endpoint paths:

- **User endpoints** (`/users`, `/api/user`) → User objects with name, email, avatar
- **Product endpoints** (`/products`, `/api/product`) → Product objects with price, SKU
- **Project endpoints** (`/projects`, `/api/project`) → Project objects with status, progress
- **Order endpoints** (`/orders`, `/api/order`) → Order objects with items, status
- **Other paths** → Generic objects with id, name, description

## Testing the Module

After setup and app restart:

```bash
# 1. Test mock response generation (replace with actual endpoint ID from DB)
curl http://localhost:3000/mock/{endpointId}

# 2. Test project endpoints listing (replace with actual project ID from DB)
curl http://localhost:3000/mock/project/{projectId}/endpoints
```

## Next Steps

1. Run setup script to create files
2. Update app.module.ts with MockServerModule import
3. Run `npm run build` to compile
4. Run `npm run start:dev` to start development server
5. Test the new endpoints

## Integration with Frontend

The frontend can now:
- Display mock responses for testing
- Enable/disable mocks per endpoint
- Generate sample requests/responses for documentation
- Test API specifications without hitting real servers

## Features Implemented

✓ Intelligent mock data generation based on endpoint structure
✓ Support for predefined response bodies
✓ Smart collection/resource detection
✓ Context-aware data (users, products, projects, orders, articles, teams)
✓ Proper HTTP status code and header handling
✓ NestJS module integration with Prisma
✓ Two API endpoints for mock server functionality

