"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockServerController = void 0;
const common_1 = require("@nestjs/common");
const mock_server_service_1 = require("./mock-server.service");
let MockServerController = class MockServerController {
    mockService;
    constructor(mockService) {
        this.mockService = mockService;
    }
    async getMockResponse(endpointId) {
        try {
            return await this.mockService.generateMockResponse(endpointId);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
};
exports.MockServerController = MockServerController;
__decorate([
    (0, common_1.Get)(':endpointId'),
    __param(0, (0, common_1.Param)('endpointId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MockServerController.prototype, "getMockResponse", null);
exports.MockServerController = MockServerController = __decorate([
    (0, common_1.Controller)('mock'),
    __metadata("design:paramtypes", [mock_server_service_1.MockServerService])
], MockServerController);
//# sourceMappingURL=mock-server.controller.js.map