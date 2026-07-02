import { Controller, Get, Param, BadRequestException } from '@nestjs/common';
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
