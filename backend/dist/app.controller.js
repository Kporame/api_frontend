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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const app_service_1 = require("./app.service");
const prisma_service_1 = require("./prisma/prisma.service");
let AppController = class AppController {
    appService;
    prisma;
    constructor(appService, prisma) {
        this.appService = appService;
        this.prisma = prisma;
    }
    async getProjects(search, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        const visibilityFilter = userRole === 'GUEST' ? { visibility: 'PUBLIC' } : {};
        const teams = await this.prisma.team.findMany({
            include: {
                projects: {
                    where: {
                        ...visibilityFilter,
                        ...(search ? {
                            OR: [
                                { name: { contains: search } },
                                { description: { contains: search } },
                                {
                                    documents: {
                                        some: {
                                            endpoints: {
                                                some: {
                                                    OR: [
                                                        { title: { contains: search } },
                                                        { path: { contains: search } }
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                }
                            ]
                        } : {})
                    },
                    include: {
                        documents: {
                            include: {
                                endpoints: true
                            }
                        }
                    }
                }
            }
        });
        return teams.filter((t) => t.projects.length > 0);
    }
    async updateProjectVisibility(id, visibility, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
            throw new common_1.BadRequestException('Only admins and developers can change project visibility');
        }
        return this.prisma.project.update({
            where: { id },
            data: { visibility }
        });
    }
    async updateProjectLinks(id, githubUrl, domainUrl, documentUrl, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
            throw new common_1.BadRequestException('Only admins and developers can change project settings');
        }
        return this.prisma.project.update({
            where: { id },
            data: {
                githubUrl: githubUrl !== undefined ? githubUrl : undefined,
                domainUrl: domainUrl !== undefined ? domainUrl : undefined,
                documentUrl: documentUrl !== undefined ? documentUrl : undefined,
            }
        });
    }
    async handleGithubWebhook(projectId, body) {
        if (!projectId) {
            throw new common_1.BadRequestException('projectId query parameter is required');
        }
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { documents: { orderBy: { createdAt: 'desc' } } }
        });
        if (!project) {
            throw new common_1.BadRequestException('Project not found');
        }
        let latestVersion = '1.0.0';
        let currentRawFile = JSON.stringify({
            openapi: '3.0.0',
            info: { title: project.name, version: '1.0.0' },
            paths: {
                '/api/health': {
                    get: {
                        summary: 'Health check',
                        responses: { '200': { description: 'OK' } }
                    }
                }
            }
        });
        if (project.documents && project.documents.length > 0) {
            latestVersion = project.documents[0].version;
            currentRawFile = project.documents[0].rawFile;
        }
        let newVersion = '1.0.1';
        const verParts = latestVersion.split('.');
        if (verParts.length === 3) {
            const patch = parseInt(verParts[2], 10);
            if (!isNaN(patch)) {
                newVersion = `${verParts[0]}.${verParts[1]}.${patch + 1}`;
            }
        }
        else {
            newVersion = latestVersion + '-updated';
        }
        let updatedRaw;
        try {
            updatedRaw = JSON.parse(currentRawFile);
        }
        catch (e) {
            try {
                const yaml = require('js-yaml');
                updatedRaw = yaml.load(currentRawFile);
            }
            catch (yErr) {
                updatedRaw = { openapi: '3.0.0', info: { title: project.name, version: newVersion }, paths: {} };
            }
        }
        if (!updatedRaw.paths)
            updatedRaw.paths = {};
        const syncTime = new Date().toLocaleTimeString();
        const endpointPath = `/api/git-sync-${Date.now().toString().slice(-4)}`;
        updatedRaw.paths[endpointPath] = {
            get: {
                summary: `Git Sync Endpoint (Created at ${syncTime})`,
                description: 'This endpoint was automatically created/updated via GitHub Webhook sync!',
                responses: {
                    '200': {
                        description: 'Success',
                        content: {
                            'application/json': {
                                example: {
                                    success: true,
                                    syncedAt: new Date().toISOString(),
                                    message: 'Successfully updated from GitHub commit!'
                                }
                            }
                        }
                    }
                }
            }
        };
        const newDoc = await this.prisma.apiDocument.create({
            data: {
                projectId: project.id,
                version: newVersion,
                rawFile: JSON.stringify(updatedRaw, null, 2)
            }
        });
        const endpointsData = [];
        for (const [path, methods] of Object.entries(updatedRaw.paths)) {
            for (const [method, detailsObj] of Object.entries(methods)) {
                const details = detailsObj;
                if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                    const responses = details.responses || {};
                    let responseStatus = '200';
                    let responseBody = null;
                    if (responses['200']) {
                        const content = responses['200'].content;
                        if (content && content['application/json'] && content['application/json'].example) {
                            responseBody = JSON.stringify(content['application/json'].example, null, 2);
                        }
                    }
                    endpointsData.push({
                        documentId: newDoc.id,
                        method: method.toUpperCase(),
                        path: path,
                        title: details.summary || `${method.toUpperCase()} ${path}`,
                        description: details.description || '',
                        responseStatus: responseStatus,
                        responseBody: responseBody,
                        isPublic: false
                    });
                }
            }
        }
        if (endpointsData.length > 0) {
            await this.prisma.apiEndpoint.createMany({
                data: endpointsData
            });
        }
        await this.prisma.auditLog.create({
            data: {
                userId: 'system-git-webhook',
                action: 'github_webhook_sync',
                endpointPath: endpointPath,
                details: JSON.stringify({
                    projectId: project.id,
                    projectName: project.name,
                    oldVersion: latestVersion,
                    newVersion: newVersion,
                    commit: body?.head_commit?.id || 'simulated-commit-sha',
                    message: body?.head_commit?.message || 'Update api specs via git webhook sync'
                })
            }
        });
        return {
            success: true,
            message: `Successfully processed GitHub Webhook sync for project: ${project.name}`,
            oldVersion: latestVersion,
            newVersion: newVersion,
            documentId: newDoc.id
        };
    }
    async deleteProject(id, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
            throw new common_1.BadRequestException('Only admins and developers can delete projects');
        }
        const project = await this.prisma.project.findUnique({ where: { id } });
        if (!project) {
            throw new common_1.BadRequestException('Project not found');
        }
        const documents = await this.prisma.apiDocument.findMany({
            where: { projectId: id },
            select: { id: true }
        });
        const docIds = documents.map(d => d.id);
        await this.prisma.apiEndpoint.deleteMany({
            where: { documentId: { in: docIds } }
        });
        await this.prisma.apiDocument.deleteMany({
            where: { projectId: id }
        });
        await this.prisma.projectAccess.deleteMany({
            where: { projectId: id }
        });
        await this.prisma.project.delete({
            where: { id }
        });
        return { message: 'Project deleted successfully' };
    }
    async deleteProjectVersion(projectId, versionId, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
            throw new common_1.BadRequestException('Only admins and developers can delete project versions');
        }
        const doc = await this.prisma.apiDocument.findFirst({
            where: { id: versionId, projectId }
        });
        if (!doc) {
            throw new common_1.BadRequestException('Version not found');
        }
        await this.prisma.apiEndpoint.deleteMany({
            where: { documentId: versionId }
        });
        await this.prisma.apiDocument.delete({
            where: { id: versionId }
        });
        return { message: 'Version deleted successfully' };
    }
    async getProject(id, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        const project = await this.prisma.project.findUnique({
            where: { id },
            include: {
                documents: {
                    select: { id: true, version: true, createdAt: true, fileType: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!project)
            return null;
        if (project.visibility !== 'PUBLIC' && userRole === 'GUEST') {
            return null;
        }
        return project;
    }
    async getProjectEndpoints(projectId, version, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        const whereClause = { projectId };
        if (version) {
            whereClause.version = version;
        }
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            return { fileType: '', fileName: '', endpoints: [] };
        if (userRole === 'GUEST' && project.visibility !== 'PUBLIC') {
            return { fileType: '', fileName: '', endpoints: [] };
        }
        const endpointFilter = userRole === 'GUEST' ? { isPublic: true } : {};
        const document = await this.prisma.apiDocument.findFirst({
            where: whereClause,
            include: {
                endpoints: {
                    where: endpointFilter
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        if (!document)
            return { fileType: '', fileName: '', endpoints: [] };
        return {
            fileType: document.fileType,
            fileName: document.fileName,
            endpoints: document.endpoints
        };
    }
    async toggleEndpointVisibility(id, isPublic, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
            throw new common_1.BadRequestException('Only admins and developers can change endpoint visibility');
        }
        return this.prisma.apiEndpoint.update({
            where: { id },
            data: { isPublic }
        });
    }
    async toggleBulkEndpointVisibility(endpointIds, isPublic, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
            throw new common_1.BadRequestException('Only admins and developers can change endpoint visibility');
        }
        return this.prisma.apiEndpoint.updateMany({
            where: { id: { in: endpointIds } },
            data: { isPublic }
        });
    }
    async login(body) {
        const { email, password } = body;
        if (!email || !password) {
            throw new common_1.BadRequestException('Email and password are required');
        }
        let user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email,
                    password,
                    name: email.split('@')[0],
                    role: email.includes('admin') ? 'ADMIN' : 'DEVELOPER'
                }
            });
        }
        else if (user.password !== password) {
            throw new common_1.BadRequestException('Invalid credentials');
        }
        const token = Buffer.from(JSON.stringify({ id: user.id, role: user.role })).toString('base64');
        return {
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                teamId: user.teamId
            },
            token
        };
    }
    async proxyRequest(reqData) {
        try {
            const options = {
                method: reqData.method || 'GET',
                headers: reqData.headers || { 'Content-Type': 'application/json' },
            };
            if (reqData.body && ['POST', 'PUT', 'PATCH'].includes(reqData.method.toUpperCase())) {
                options.body = typeof reqData.body === 'string' ? reqData.body : JSON.stringify(reqData.body);
            }
            let targetUrl = reqData.url;
            if (targetUrl.includes('{{BASE_API_ENV}}'))
                targetUrl = targetUrl.replace('{{BASE_API_ENV}}', 'https://api.egov.go.th/ws/dga/czp/uat');
            if (targetUrl.includes('{{BASE_API}}'))
                targetUrl = targetUrl.replace('{{BASE_API}}', 'https://api.egov.go.th/ws');
            if (targetUrl.startsWith('{{'))
                targetUrl = targetUrl.replace(/^{{[^}]+}}/, 'https://api.egov.go.th/ws/dga/czp/uat');
            if (targetUrl.startsWith('/'))
                targetUrl = 'https://api.egov.go.th' + targetUrl;
            const response = await fetch(targetUrl, options);
            const data = await response.text();
            let parsedData = data;
            try {
                parsedData = JSON.parse(data);
            }
            catch (e) { }
            return {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                data: parsedData
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Proxy error: ${error.message}`);
        }
    }
    async uploadFile(file, reqTeamName, reqProjectName, reqVersion, reqGrantRole, authHeader) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
            throw new common_1.BadRequestException('Only admins and developers can upload files');
        }
        try {
            const fileContent = file.buffer.toString('utf-8');
            let parsedData;
            if (file.originalname.endsWith('.yaml') || file.originalname.endsWith('.yml')) {
                const yaml = require('js-yaml');
                parsedData = yaml.load(fileContent);
            }
            else {
                parsedData = JSON.parse(fileContent);
            }
            let title = reqProjectName || "Untitled Project";
            let description = "Imported from file";
            if (parsedData.openapi || parsedData.swagger) {
                if (!reqProjectName && parsedData.info && parsedData.info.title)
                    title = parsedData.info.title;
                if (parsedData.info && parsedData.info.description)
                    description = parsedData.info.description;
            }
            else if (parsedData.info && parsedData.item) {
                if (!reqProjectName && parsedData.info.name)
                    title = parsedData.info.name;
                if (parsedData.info.description)
                    description = parsedData.info.description;
            }
            const targetTeamName = reqTeamName || 'Core Team';
            let team = await this.prisma.team.findFirst({
                where: { name: targetTeamName }
            });
            if (!team) {
                team = await this.prisma.team.create({
                    data: { name: targetTeamName, description: `Auto-generated team for ${targetTeamName}` }
                });
            }
            let project = await this.prisma.project.findFirst({
                where: { name: title, teamId: team.id }
            });
            if (!project) {
                project = await this.prisma.project.create({
                    data: {
                        name: title,
                        description: description,
                        teamId: team.id
                    }
                });
            }
            else {
                project = await this.prisma.project.update({
                    where: { id: project.id },
                    data: {
                        description: description || project.description,
                    }
                });
            }
            const targetVersion = reqVersion || "1.0.0";
            let fileType = 'unknown';
            if (parsedData.paths) {
                fileType = 'swagger';
            }
            else if (parsedData.info && parsedData.item) {
                fileType = 'postman';
            }
            const document = await this.prisma.apiDocument.create({
                data: {
                    projectId: project.id,
                    fileName: file.originalname,
                    fileType: fileType,
                    rawFile: fileContent,
                    version: targetVersion
                }
            });
            const grantRole = reqGrantRole && ['GUEST', 'DEVELOPER', 'ADMIN'].includes(reqGrantRole.toUpperCase())
                ? reqGrantRole.toUpperCase()
                : 'DEVELOPER';
            const usersToGrant = await this.prisma.user.findMany({
                where: {
                    OR: [
                        { role: grantRole },
                        { role: 'ADMIN' }
                    ]
                },
                select: { id: true }
            });
            for (const user of usersToGrant) {
                await this.prisma.projectAccess.upsert({
                    where: { projectId_userId: { projectId: project.id, userId: user.id } },
                    update: { role: 'VIEWER' },
                    create: { projectId: project.id, userId: user.id, role: 'VIEWER' }
                });
            }
            let endpointsData = [];
            const buildExampleFromSchema = (schema) => {
                if (!schema)
                    return null;
                if (schema.example !== undefined)
                    return schema.example;
                if (schema.default !== undefined)
                    return schema.default;
                const schemaType = schema.type || (schema.properties ? 'object' : schema.items ? 'array' : null);
                if (schemaType === 'object') {
                    const obj = {};
                    if (schema.properties) {
                        for (const [key, propertySchema] of Object.entries(schema.properties)) {
                            obj[key] = buildExampleFromSchema(propertySchema);
                        }
                    }
                    return obj;
                }
                if (schemaType === 'array') {
                    return [buildExampleFromSchema(schema.items || {})];
                }
                if (schemaType === 'string') {
                    if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0)
                        return schema.enum[0];
                    if (schema.format === 'date-time')
                        return new Date().toISOString();
                    if (schema.format === 'date')
                        return new Date().toISOString().split('T')[0];
                    if (schema.format === 'uuid')
                        return '00000000-0000-0000-0000-000000000000';
                    return 'string';
                }
                if (schemaType === 'integer' || schemaType === 'number')
                    return 0;
                if (schemaType === 'boolean')
                    return false;
                return null;
            };
            if (parsedData.paths) {
                for (const [path, methods] of Object.entries(parsedData.paths)) {
                    for (const [method, detailsObj] of Object.entries(methods)) {
                        const details = detailsObj;
                        if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                            const responses = details.responses || {};
                            let responseStatus = null;
                            let responseBody = null;
                            const successCode = Object.keys(responses).find(code => code.startsWith('2'));
                            if (successCode) {
                                responseStatus = successCode;
                                const content = responses[successCode].content;
                                if (content && content['application/json'] && content['application/json'].example) {
                                    responseBody = JSON.stringify(content['application/json'].example, null, 2);
                                }
                                else if (responses[successCode].description) {
                                    responseBody = responses[successCode].description;
                                }
                            }
                            let requestBody = null;
                            let requestHeaders = null;
                            if (details.requestBody && details.requestBody.content) {
                                const reqContent = details.requestBody.content;
                                const mediaTypeKey = Object.keys(reqContent).find((mediaType) => mediaType.toLowerCase().includes('application/json')) || Object.keys(reqContent)[0];
                                const media = reqContent[mediaTypeKey];
                                if (media) {
                                    if (media.example !== undefined) {
                                        requestBody = JSON.stringify(media.example, null, 2);
                                    }
                                    else if (media.examples) {
                                        const exKey = Object.keys(media.examples)[0];
                                        const ex = media.examples[exKey];
                                        if (ex && ex.value)
                                            requestBody = JSON.stringify(ex.value, null, 2);
                                    }
                                    else if (media.schema) {
                                        const example = buildExampleFromSchema(media.schema);
                                        if (example !== null)
                                            requestBody = JSON.stringify(example, null, 2);
                                    }
                                    else if (mediaTypeKey.toLowerCase().includes('x-www-form-urlencoded') || mediaTypeKey.toLowerCase().includes('formdata')) {
                                        requestBody = JSON.stringify({ example: 'value' }, null, 2);
                                    }
                                }
                            }
                            if (details.parameters && Array.isArray(details.parameters)) {
                                const hdrs = {};
                                for (const p of details.parameters) {
                                    if (p.in === 'header' && p.name) {
                                        hdrs[p.name] = p.example || (p.schema && p.schema.example) || '';
                                    }
                                }
                                if (Object.keys(hdrs).length > 0)
                                    requestHeaders = JSON.stringify(hdrs, null, 2);
                            }
                            endpointsData.push({
                                documentId: document.id,
                                method: method.toUpperCase(),
                                path: path,
                                title: details.summary || `${method.toUpperCase()} ${path}`,
                                description: details.description || '',
                                requestHeaders: requestHeaders,
                                requestBody: requestBody,
                                responseStatus: responseStatus,
                                responseBody: responseBody,
                                isPublic: false
                            });
                        }
                    }
                }
            }
            else if (parsedData.info && parsedData.item) {
                const postmanVars = {};
                if (parsedData.variable && Array.isArray(parsedData.variable)) {
                    for (const v of parsedData.variable) {
                        if (v.key && v.value)
                            postmanVars[v.key] = v.value;
                    }
                }
                const extractPostmanEndpoints = (items) => {
                    let eps = [];
                    for (const item of items) {
                        if (item.request) {
                            const method = item.request.method;
                            let path = '';
                            if (typeof item.request.url === 'string') {
                                path = item.request.url;
                            }
                            else if (item.request.url && item.request.url.raw) {
                                path = item.request.url.raw;
                            }
                            for (const [key, value] of Object.entries(postmanVars)) {
                                path = path.replace(new RegExp(`{{${key}}}`, 'g'), value);
                            }
                            if (!path.startsWith('/') && !path.startsWith('{{') && !path.startsWith('http')) {
                                path = '/' + path;
                            }
                            let requestBody = null;
                            if (item.request.body) {
                                if (item.request.body.raw) {
                                    requestBody = item.request.body.raw;
                                    for (const [key, value] of Object.entries(postmanVars)) {
                                        requestBody = requestBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
                                    }
                                }
                                else if (item.request.body.urlencoded && Array.isArray(item.request.body.urlencoded)) {
                                    const formed = {};
                                    for (const field of item.request.body.urlencoded) {
                                        if (field.key) {
                                            formed[field.key] = field.value || '';
                                        }
                                    }
                                    requestBody = JSON.stringify(formed, null, 2);
                                }
                                else if (item.request.body.formdata && Array.isArray(item.request.body.formdata)) {
                                    const formed = {};
                                    for (const field of item.request.body.formdata) {
                                        if (field.key) {
                                            formed[field.key] = field.value || (field.src ? `<file:${field.src}>` : '');
                                        }
                                    }
                                    requestBody = JSON.stringify(formed, null, 2);
                                }
                                else if (item.request.body.file) {
                                    requestBody = item.request.body.file.src || '<file>';
                                }
                            }
                            let requestHeaders = null;
                            if (item.request.header && Array.isArray(item.request.header)) {
                                const headerObj = {};
                                for (const h of item.request.header) {
                                    if (h.key) {
                                        let val = h.value || '';
                                        for (const [key, value] of Object.entries(postmanVars)) {
                                            val = val.replace(new RegExp(`{{${key}}}`, 'g'), value);
                                        }
                                        headerObj[h.key] = val;
                                    }
                                }
                                if (Object.keys(headerObj).length > 0) {
                                    requestHeaders = JSON.stringify(headerObj, null, 2);
                                }
                            }
                            let responseStatus = null;
                            let responseBody = null;
                            if (item.response && item.response.length > 0) {
                                const res = item.response[0];
                                responseStatus = res.code ? res.code.toString() : '200';
                                responseBody = res.body;
                            }
                            eps.push({
                                documentId: document.id,
                                method: method ? method.toUpperCase() : 'GET',
                                path: path || '/',
                                title: item.name || `${method} ${path}`,
                                description: item.request.description || '',
                                requestHeaders: requestHeaders,
                                requestBody: requestBody,
                                responseStatus: responseStatus,
                                responseBody: responseBody,
                                isPublic: false
                            });
                        }
                        if (item.item && Array.isArray(item.item)) {
                            eps = eps.concat(extractPostmanEndpoints(item.item));
                        }
                    }
                    return eps;
                };
                endpointsData = extractPostmanEndpoints(parsedData.item);
            }
            if (endpointsData.length > 0) {
                await this.prisma.apiEndpoint.createMany({
                    data: endpointsData
                });
            }
            return {
                message: 'File uploaded and parsed successfully!',
                documentId: document.id,
                fileName: file.originalname,
                size: file.size
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to process upload: ${error.message}`);
        }
    }
    async logAudit(body, headers) {
        const maskSensitiveData = (data) => {
            if (!data)
                return data;
            let masked = data;
            masked = masked.replace(/"password"\s*:\s*"[^"]*"/gi, '"password": "********"');
            masked = masked.replace(/"token"\s*:\s*"[^"]*"/gi, '"token": "********"');
            masked = masked.replace(/"authorization"\s*:\s*"[^"]*"/gi, '"authorization": "Bearer ********"');
            masked = masked.replace(/"api[_-]?key"\s*:\s*"[^"]*"/gi, '"api_key": "********"');
            return masked;
        };
        const isMasked = body.requestBody && (body.requestBody.includes('password') || body.requestBody.includes('token'));
        const maskedBody = isMasked ? maskSensitiveData(body.requestBody) : body.requestBody;
        await this.prisma.auditLog.create({
            data: {
                userId: body.userId,
                action: body.action,
                endpointPath: body.endpointPath,
                requestUrl: body.requestUrl ? maskSensitiveData(body.requestUrl) : null,
                requestMethod: body.requestMethod,
                requestBody: maskedBody,
                responseStatus: body.responseStatus,
                responseTime: body.responseTime,
                ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'] || body.ipAddress,
                userAgent: headers['user-agent'],
                details: body.details,
                isMasked
            }
        });
        return { success: true };
    }
    async getAuditLogs(limit, offset) {
        const take = limit ? Math.min(limit, 100) : 50;
        const skip = offset ? Math.max(offset, 0) : 0;
        const logs = await this.prisma.auditLog.findMany({
            take,
            skip,
            orderBy: { createdAt: 'desc' }
        });
        const total = await this.prisma.auditLog.count();
        return {
            data: logs,
            total,
            limit: take,
            offset: skip
        };
    }
    async getTestHistory(projectId) {
        const logs = await this.prisma.auditLog.findMany({
            where: {
                action: 'test_request',
                details: {
                    contains: projectId
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return logs;
    }
    async getProjectAccess(projectId, authHeader) {
        let userRole = 'GUEST';
        let userId = '';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                    userId = decoded.id;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN') {
            throw new common_1.BadRequestException('Only admins can view project access');
        }
        const accesses = await this.prisma.projectAccess.findMany({
            where: { projectId },
            include: {
                user: {
                    select: { id: true, email: true, name: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return accesses;
    }
    async grantProjectAccess(projectId, userId, accessRole = 'VIEWER', authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN') {
            throw new common_1.BadRequestException('Only admins can grant project access');
        }
        if (!['VIEWER', 'EDITOR', 'ADMIN'].includes(accessRole)) {
            throw new common_1.BadRequestException('Invalid access role');
        }
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            throw new common_1.BadRequestException('Project not found');
        }
        if (userId === 'all') {
            try {
                const allUsers = await this.prisma.user.findMany({ select: { id: true } });
                const results = [];
                for (const u of allUsers) {
                    const access = await this.prisma.projectAccess.upsert({
                        where: { projectId_userId: { projectId, userId: u.id } },
                        update: { role: accessRole },
                        create: { projectId, userId: u.id, role: accessRole },
                    });
                    results.push(access);
                }
                return {
                    message: 'Access granted to all users',
                    count: results.length
                };
            }
            catch (error) {
                throw new common_1.BadRequestException(`Failed to grant access to all users: ${error.message}`);
            }
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        try {
            const access = await this.prisma.projectAccess.upsert({
                where: { projectId_userId: { projectId, userId } },
                update: { role: accessRole },
                create: { projectId, userId, role: accessRole },
                include: {
                    user: {
                        select: { id: true, email: true, name: true }
                    }
                }
            });
            return {
                message: `Access granted to ${user.email}`,
                access
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to grant access: ${error.message}`);
        }
    }
    async revokeProjectAccess(projectId, userId, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN') {
            throw new common_1.BadRequestException('Only admins can revoke project access');
        }
        try {
            await this.prisma.projectAccess.delete({
                where: { projectId_userId: { projectId, userId } }
            });
            return { message: 'Access revoked successfully' };
        }
        catch (error) {
            throw new common_1.BadRequestException('Access record not found');
        }
    }
    async getAllUsers(authHeader, search) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN') {
            throw new common_1.BadRequestException('Only admins can view all users');
        }
        const users = await this.prisma.user.findMany({
            where: search ? {
                OR: [
                    { email: { contains: search } },
                    { name: { contains: search } }
                ]
            } : {},
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                projectAccesses: {
                    select: { projectId: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return users;
    }
    async createUser(body, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN') {
            throw new common_1.BadRequestException('Only admins can create users');
        }
        const { email, name, password, role } = body;
        if (!email || !name || !password) {
            throw new common_1.BadRequestException('Email, name, and password are required');
        }
        if (!['GUEST', 'DEVELOPER', 'ADMIN'].includes(role)) {
            throw new common_1.BadRequestException('Role must be GUEST, DEVELOPER, or ADMIN');
        }
        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new common_1.BadRequestException('User with this email already exists');
        }
        const user = await this.prisma.user.create({
            data: {
                email,
                name,
                password,
                role
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });
        return {
            message: 'User created successfully',
            user
        };
    }
    async updateUser(id, body, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN') {
            throw new common_1.BadRequestException('Only admins can update users');
        }
        const { name, role } = body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (role && ['GUEST', 'DEVELOPER', 'ADMIN'].includes(role))
            updateData.role = role;
        const user = await this.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });
        return {
            message: 'User updated successfully',
            user
        };
    }
    async deleteUser(id, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN') {
            throw new common_1.BadRequestException('Only admins can delete users');
        }
        await this.prisma.user.delete({ where: { id } });
        return { message: 'User deleted successfully' };
    }
    async getUserProjects(userId, authHeader) {
        let userRole = 'GUEST';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                if (decoded && decoded.role) {
                    userRole = decoded.role;
                }
            }
            catch (e) { }
        }
        if (userRole !== 'ADMIN') {
            throw new common_1.BadRequestException('Only admins can view user projects');
        }
        const accesses = await this.prisma.projectAccess.findMany({
            where: { userId },
            include: {
                project: {
                    select: { id: true, name: true, description: true }
                }
            }
        });
        return accesses;
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('projects'),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getProjects", null);
__decorate([
    (0, common_1.Patch)('projects/:id/visibility'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('visibility')),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updateProjectVisibility", null);
__decorate([
    (0, common_1.Patch)('projects/:id/links'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('githubUrl')),
    __param(2, (0, common_1.Body)('domainUrl')),
    __param(3, (0, common_1.Body)('documentUrl')),
    __param(4, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updateProjectLinks", null);
__decorate([
    (0, common_1.Post)('webhooks/github'),
    __param(0, (0, common_1.Query)('projectId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "handleGithubWebhook", null);
__decorate([
    (0, common_1.Delete)('projects/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "deleteProject", null);
__decorate([
    (0, common_1.Delete)('projects/:projectId/versions/:versionId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('versionId')),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "deleteProjectVersion", null);
__decorate([
    (0, common_1.Get)('projects/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getProject", null);
__decorate([
    (0, common_1.Get)('projects/:id/endpoints'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('version')),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getProjectEndpoints", null);
__decorate([
    (0, common_1.Patch)('endpoints/:id/visibility'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('isPublic')),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "toggleEndpointVisibility", null);
__decorate([
    (0, common_1.Patch)('endpoints/bulk-visibility'),
    __param(0, (0, common_1.Body)('endpointIds')),
    __param(1, (0, common_1.Body)('isPublic')),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Boolean, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "toggleBulkEndpointVisibility", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('proxy'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "proxyRequest", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('teamName')),
    __param(2, (0, common_1.Body)('projectName')),
    __param(3, (0, common_1.Body)('version')),
    __param(4, (0, common_1.Body)('grantRole')),
    __param(5, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Post)('audit-log'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "logAudit", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('test-history/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getTestHistory", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/access'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getProjectAccess", null);
__decorate([
    (0, common_1.Post)('projects/:projectId/access'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)('userId')),
    __param(2, (0, common_1.Body)('accessRole')),
    __param(3, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "grantProjectAccess", null);
__decorate([
    (0, common_1.Delete)('projects/:projectId/access/:userId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "revokeProjectAccess", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Post)('users'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "createUser", null);
__decorate([
    (0, common_1.Patch)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('users/:id/projects'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getUserProjects", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [app_service_1.AppService,
        prisma_service_1.PrismaService])
], AppController);
//# sourceMappingURL=app.controller.js.map