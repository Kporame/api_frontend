import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
export declare class AppController {
    private readonly appService;
    private readonly prisma;
    constructor(appService: AppService, prisma: PrismaService);
    getProjects(search?: string, authHeader?: string): Promise<({
        projects: ({
            documents: ({
                endpoints: {
                    id: string;
                    description: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    path: string;
                    title: string;
                    method: string;
                    requestBody: string | null;
                    responseStatus: string | null;
                    documentId: string;
                    isPublic: boolean;
                    requestHeaders: string | null;
                    responseBody: string | null;
                }[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                projectId: string;
                fileName: string;
                fileType: string;
                version: string;
                rawFile: string;
            })[];
        } & {
            visibility: string;
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            githubUrl: string | null;
            domainUrl: string | null;
            documentUrl: string | null;
            teamId: string;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    updateProjectVisibility(id: string, visibility: string, authHeader?: string): Promise<{
        visibility: string;
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        githubUrl: string | null;
        domainUrl: string | null;
        documentUrl: string | null;
        teamId: string;
    }>;
    updateProjectLinks(id: string, githubUrl?: string, domainUrl?: string, documentUrl?: string, authHeader?: string): Promise<{
        visibility: string;
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        githubUrl: string | null;
        domainUrl: string | null;
        documentUrl: string | null;
        teamId: string;
    }>;
    handleGithubWebhook(projectId: string, body: any): Promise<{
        success: boolean;
        message: string;
        oldVersion: string;
        newVersion: string;
        documentId: string;
    }>;
    deleteProject(id: string, authHeader?: string): Promise<{
        message: string;
    }>;
    deleteProjectVersion(projectId: string, versionId: string, authHeader?: string): Promise<{
        message: string;
    }>;
    getProject(id: string, authHeader?: string): Promise<({
        documents: {
            id: string;
            createdAt: Date;
            fileType: string;
            version: string;
        }[];
    } & {
        visibility: string;
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        githubUrl: string | null;
        domainUrl: string | null;
        documentUrl: string | null;
        teamId: string;
    }) | null>;
    getProjectEndpoints(projectId: string, version?: string, authHeader?: string): Promise<{
        fileType: string;
        fileName: string;
        endpoints: {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            path: string;
            title: string;
            method: string;
            requestBody: string | null;
            responseStatus: string | null;
            documentId: string;
            isPublic: boolean;
            requestHeaders: string | null;
            responseBody: string | null;
        }[];
    }>;
    toggleEndpointVisibility(id: string, isPublic: boolean, authHeader?: string): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        path: string;
        title: string;
        method: string;
        requestBody: string | null;
        responseStatus: string | null;
        documentId: string;
        isPublic: boolean;
        requestHeaders: string | null;
        responseBody: string | null;
    }>;
    toggleBulkEndpointVisibility(endpointIds: string[], isPublic: boolean, authHeader?: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    login(body: any): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            name: string;
            role: string;
            teamId: string | null;
        };
        token: string;
    }>;
    proxyRequest(reqData: {
        url: string;
        method: string;
        headers?: any;
        body?: any;
    }): Promise<{
        status: number;
        statusText: string;
        headers: {
            [k: string]: string;
        };
        data: string;
    }>;
    uploadFile(file: any, reqTeamName?: string, reqProjectName?: string, reqVersion?: string, reqGrantRole?: string, authHeader?: string): Promise<{
        message: string;
        documentId: string;
        fileName: any;
        size: any;
    }>;
    logAudit(body: any, headers: any): Promise<{
        success: boolean;
    }>;
    getAuditLogs(limit?: number, offset?: number): Promise<{
        data: {
            id: string;
            createdAt: Date;
            userId: string | null;
            action: string;
            endpointPath: string | null;
            requestUrl: string | null;
            requestMethod: string | null;
            requestBody: string | null;
            responseStatus: number | null;
            responseTime: number | null;
            ipAddress: string | null;
            userAgent: string | null;
            details: string | null;
            isMasked: boolean;
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getTestHistory(projectId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string | null;
        action: string;
        endpointPath: string | null;
        requestUrl: string | null;
        requestMethod: string | null;
        requestBody: string | null;
        responseStatus: number | null;
        responseTime: number | null;
        ipAddress: string | null;
        userAgent: string | null;
        details: string | null;
        isMasked: boolean;
    }[]>;
    getProjectAccess(projectId: string, authHeader?: string): Promise<any>;
    grantProjectAccess(projectId: string, userId: string, accessRole?: string, authHeader?: string): Promise<{
        message: string;
        count: number;
        access?: undefined;
    } | {
        message: string;
        access: any;
        count?: undefined;
    }>;
    revokeProjectAccess(projectId: string, userId: string, authHeader?: string): Promise<{
        message: string;
    }>;
    getAllUsers(authHeader?: string, search?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        email: string;
        role: string;
        projectAccesses: {
            projectId: string;
        }[];
    }[]>;
    createUser(body: any, authHeader?: string): Promise<{
        message: string;
        user: {
            id: string;
            name: string;
            createdAt: Date;
            email: string;
            role: string;
        };
    }>;
    updateUser(id: string, body: any, authHeader?: string): Promise<{
        message: string;
        user: {
            id: string;
            name: string;
            createdAt: Date;
            email: string;
            role: string;
        };
    }>;
    deleteUser(id: string, authHeader?: string): Promise<{
        message: string;
    }>;
    getUserProjects(userId: string, authHeader?: string): Promise<any>;
}
