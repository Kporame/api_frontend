import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class MockServerService {
  constructor(private readonly prisma: PrismaService) {}

  async generateMockResponse(endpointId: string) {
    const endpoint = await this.prisma.apiEndpoint.findUnique({
      where: { id: endpointId },
    });

    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    if (endpoint.responseBody) {
      try {
        return {
          status: 200,
          data: JSON.parse(endpoint.responseBody)
        };
      } catch (e) {
        return {
          status: 200,
          data: endpoint.responseBody
        };
      }
    }

    return {
      status: 200,
      data: { success: true, message: 'Mock data', endpoint: endpoint.path }
    };
  }
}
