import { MockServerService } from './mock-server.service';
export declare class MockServerController {
    private readonly mockService;
    constructor(mockService: MockServerService);
    getMockResponse(endpointId: string): Promise<{
        status: number;
        data: any;
    }>;
}
