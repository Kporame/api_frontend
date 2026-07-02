import { Module } from '@nestjs/common';
import { MockServerController } from './mock-server.controller';
import { MockServerService } from './mock-server.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MockServerController],
  providers: [MockServerService],
  exports: [MockServerService]
})
export class MockServerModule {}
