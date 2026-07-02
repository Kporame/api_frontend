import { PrismaService } from './prisma/prisma.service';
export declare class MockServerService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    generateMockResponse(endpointId: string): Promise<{
        status: number;
        data: any;
    }>;
}
