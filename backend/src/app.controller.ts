import { Controller, Post, Get, Patch, Delete, Param, Query, Body, UseInterceptors, UploadedFile, BadRequestException, Headers } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import * as yaml from 'js-yaml';

@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService
  ) {}

  @Get('projects')
  async getProjects(
    @Query('search') search?: string,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
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

    // Only return teams that have projects (after filtering)
    return teams.filter((t: any) => t.projects.length > 0);
  }

  @Patch('projects/:id/visibility')
  async updateProjectVisibility(
    @Param('id') id: string,
    @Body('visibility') visibility: string,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
      throw new BadRequestException('Only admins and developers can change project visibility');
    }

    return this.prisma.project.update({
      where: { id },
      data: { visibility }
    });
  }

  @Patch('projects/:id/links')
  async updateProjectLinks(
    @Param('id') id: string,
    @Body('githubUrl') githubUrl?: string,
    @Body('domainUrl') domainUrl?: string,
    @Body('documentUrl') documentUrl?: string,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
      throw new BadRequestException('Only admins and developers can change project settings');
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

  @Post('webhooks/github')
  async handleGithubWebhook(
    @Query('projectId') projectId: string,
    @Body() body: any
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { documents: { orderBy: { createdAt: 'desc' } } }
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Determine the new version
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

    // Increment version for Git sync
    let newVersion = '1.0.1';
    const verParts = latestVersion.split('.');
    if (verParts.length === 3) {
      const patch = parseInt(verParts[2], 10);
      if (!isNaN(patch)) {
        newVersion = `${verParts[0]}.${verParts[1]}.${patch + 1}`;
      }
    } else {
      newVersion = latestVersion + '-updated';
    }

    // Modify the raw file to add a new endpoint to show a simulated change
    let updatedRaw: any;
    try {
      updatedRaw = JSON.parse(currentRawFile);
    } catch (e) {
      try {
        const yaml = require('js-yaml');
        updatedRaw = yaml.load(currentRawFile);
      } catch (yErr) {
        updatedRaw = { openapi: '3.0.0', info: { title: project.name, version: newVersion }, paths: {} };
      }
    }

    if (!updatedRaw.paths) updatedRaw.paths = {};
    
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

    // Save the new document
    const newDoc = await this.prisma.apiDocument.create({
      data: {
        projectId: project.id,
        version: newVersion,
        rawFile: JSON.stringify(updatedRaw, null, 2)
      }
    });

    // Parse and create the endpoints
    const endpointsData = [];
    for (const [path, methods] of Object.entries(updatedRaw.paths)) {
      for (const [method, detailsObj] of Object.entries(methods as any)) {
        const details: any = detailsObj;
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

    // Write audit log
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

  @Delete('projects/:id')
  async deleteProject(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
      throw new BadRequestException('Only admins and developers can delete projects');
    }

    // Verify project exists
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Delete endpoints related to the project documents
    const documents = await this.prisma.apiDocument.findMany({
      where: { projectId: id },
      select: { id: true }
    });
    const docIds = documents.map(d => d.id);

    await this.prisma.apiEndpoint.deleteMany({
      where: { documentId: { in: docIds } }
    });

    // Delete documents
    await this.prisma.apiDocument.deleteMany({
      where: { projectId: id }
    });

    // Delete project accesses
    await (this.prisma as any).projectAccess.deleteMany({
      where: { projectId: id }
    });

    // Finally delete the project
    await this.prisma.project.delete({
      where: { id }
    });

    return { message: 'Project deleted successfully' };
  }

  @Delete('projects/:projectId/versions/:versionId')
  async deleteProjectVersion(
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
      throw new BadRequestException('Only admins and developers can delete project versions');
    }

    // Verify document exists and belongs to project
    const doc = await this.prisma.apiDocument.findFirst({
      where: { id: versionId, projectId }
    });
    if (!doc) {
      throw new BadRequestException('Version not found');
    }

    // Delete endpoints first
    await this.prisma.apiEndpoint.deleteMany({
      where: { documentId: versionId }
    });

    // Delete document
    await this.prisma.apiDocument.delete({
      where: { id: versionId }
    });

    return { message: 'Version deleted successfully' };
  }

  @Get('projects/:id')
  async getProject(@Param('id') id: string, @Headers('authorization') authHeader?: string) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
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
    if (!project) return null;
    // If project is not PUBLIC, only allow authenticated users to view
    if (project.visibility !== 'PUBLIC' && userRole === 'GUEST') {
      return null;
    }

    return project;
  }

  @Get('projects/:id/endpoints')
  async getProjectEndpoints(
    @Param('id') projectId: string, 
    @Query('version') version?: string,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    const whereClause: any = { projectId };
    if (version) {
      whereClause.version = version;
    }
    // Only allow unauthenticated users to view endpoints for PUBLIC projects
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { fileType: '', fileName: '', endpoints: [] };

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

    if (!document) return { fileType: '', fileName: '', endpoints: [] };
    
    // Add fileType to response metadata
    return {
      fileType: document.fileType,
      fileName: document.fileName,
      endpoints: document.endpoints
    };
  }

  @Patch('endpoints/:id/visibility')
  async toggleEndpointVisibility(
    @Param('id') id: string,
    @Body('isPublic') isPublic: boolean,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
      throw new BadRequestException('Only admins and developers can change endpoint visibility');
    }

    return this.prisma.apiEndpoint.update({
      where: { id },
      data: { isPublic }
    });
  }

  @Patch('endpoints/bulk-visibility')
  async toggleBulkEndpointVisibility(
    @Body('endpointIds') endpointIds: string[],
    @Body('isPublic') isPublic: boolean,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
      throw new BadRequestException('Only admins and developers can change endpoint visibility');
    }

    return this.prisma.apiEndpoint.updateMany({
      where: { id: { in: endpointIds } },
      data: { isPublic }
    });
  }

  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }
    
    // Auto-create a mock user if they don't exist to make testing easy
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          password, // Mock: No hashing for MVP demo
          name: email.split('@')[0],
          role: email.includes('admin') ? 'ADMIN' : 'DEVELOPER'
        }
      });
    } else if (user.password !== password) {
      throw new BadRequestException('Invalid credentials');
    }

    // Fake simple token for demo
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

  @Post('proxy')
  async proxyRequest(@Body() reqData: { url: string, method: string, headers?: any, body?: any }) {
    try {
      const options: RequestInit = {
        method: reqData.method || 'GET',
        headers: reqData.headers || { 'Content-Type': 'application/json' },
      };
      
      if (reqData.body && ['POST', 'PUT', 'PATCH'].includes(reqData.method.toUpperCase())) {
         options.body = typeof reqData.body === 'string' ? reqData.body : JSON.stringify(reqData.body);
      }

      // Automatically replace common Postman variables for a better demo experience
      let targetUrl = reqData.url;
      if (targetUrl.includes('{{BASE_API_ENV}}')) targetUrl = targetUrl.replace('{{BASE_API_ENV}}', 'https://api.egov.go.th/ws/dga/czp/uat');
      if (targetUrl.includes('{{BASE_API}}')) targetUrl = targetUrl.replace('{{BASE_API}}', 'https://api.egov.go.th/ws');
      if (targetUrl.startsWith('{{')) targetUrl = targetUrl.replace(/^{{[^}]+}}/, 'https://api.egov.go.th/ws/dga/czp/uat');
      if (targetUrl.startsWith('/')) targetUrl = 'https://api.egov.go.th' + targetUrl;

      const response = await fetch(targetUrl, options);
      const data = await response.text();
      
      let parsedData = data;
      try {
        parsedData = JSON.parse(data);
      } catch (e) {}

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: parsedData
      };
    } catch (error: any) {
      throw new BadRequestException(`Proxy error: ${error.message}`);
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Body('teamName') reqTeamName?: string,
    @Body('projectName') reqProjectName?: string,
    @Body('version') reqVersion?: string,
    @Body('grantRole') reqGrantRole?: string,
    @Headers('authorization') authHeader?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Require authenticated admin or developer to upload files
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER') {
      throw new BadRequestException('Only admins and developers can upload files');
    }

    try {
      const fileContent = file.buffer.toString('utf-8');
      
      let parsedData: any;
      if (file.originalname.endsWith('.yaml') || file.originalname.endsWith('.yml')) {
        const yaml = require('js-yaml');
        parsedData = yaml.load(fileContent);
      } else {
        parsedData = JSON.parse(fileContent);
      }

      // Determine Project Title and Description
      let title = reqProjectName || "Untitled Project";
      let description = "Imported from file";

      if (parsedData.openapi || parsedData.swagger) {
         if (!reqProjectName && parsedData.info && parsedData.info.title) title = parsedData.info.title;
         if (parsedData.info && parsedData.info.description) description = parsedData.info.description;
      } else if (parsedData.info && parsedData.item) {
         if (!reqProjectName && parsedData.info.name) title = parsedData.info.name;
         if (parsedData.info.description) description = parsedData.info.description;
      }

      // Handle Team/Folder
      const targetTeamName = reqTeamName || 'Core Team';
      let team = await this.prisma.team.findFirst({
        where: { name: targetTeamName }
      });
      if (!team) {
        team = await this.prisma.team.create({
          data: { name: targetTeamName, description: `Auto-generated team for ${targetTeamName}` }
        });
      }

      // Handle Project
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
      } else {
        // Update existing project metadata if no specific project name was requested
        project = await this.prisma.project.update({
          where: { id: project.id },
          data: {
            description: description || project.description,
          }
        });
      }

      // Create API Document with version
      const targetVersion = reqVersion || "1.0.0";
      
      // Determine file type
      let fileType = 'unknown';
      if (parsedData.paths) {
        fileType = 'swagger';
      } else if (parsedData.info && parsedData.item) {
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

      // Grant project access to selected role and always ensure admins have access
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
        await (this.prisma as any).projectAccess.upsert({
          where: { projectId_userId: { projectId: project.id, userId: user.id } },
          update: { role: 'VIEWER' },
          create: { projectId: project.id, userId: user.id, role: 'VIEWER' }
        });
      }

    // PARSE SWAGGER/OPENAPI OR POSTMAN
    let endpointsData: any[] = [];

    const buildExampleFromSchema = (schema: any): any => {
      if (!schema) return null;
      if (schema.example !== undefined) return schema.example;
      if (schema.default !== undefined) return schema.default;
      const schemaType = schema.type || (schema.properties ? 'object' : schema.items ? 'array' : null);
      if (schemaType === 'object') {
        const obj: any = {};
        if (schema.properties) {
          for (const [key, propertySchema] of Object.entries<any>(schema.properties)) {
            obj[key] = buildExampleFromSchema(propertySchema);
          }
        }
        return obj;
      }
      if (schemaType === 'array') {
        return [buildExampleFromSchema(schema.items || {})];
      }
      if (schemaType === 'string') {
        if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'date') return new Date().toISOString().split('T')[0];
        if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
        return 'string';
      }
      if (schemaType === 'integer' || schemaType === 'number') return 0;
      if (schemaType === 'boolean') return false;
      return null;
    };

    if (parsedData.paths) {
      // SWAGGER / OPENAPI FORMAT
      for (const [path, methods] of Object.entries(parsedData.paths)) {
        for (const [method, detailsObj] of Object.entries(methods as any)) {
          const details: any = detailsObj;
          // Filter out standard HTTP methods
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
            
            // Extract responses
            const responses = details.responses || {};
            let responseStatus = null;
            let responseBody = null;
            
            // Find the first 2xx response
            const successCode = Object.keys(responses).find(code => code.startsWith('2'));
            if (successCode) {
              responseStatus = successCode;
              const content = responses[successCode].content;
              if (content && content['application/json'] && content['application/json'].example) {
                responseBody = JSON.stringify(content['application/json'].example, null, 2);
              } else if (responses[successCode].description) {
                responseBody = responses[successCode].description;
              }
            }

            // Extract request body (if present) for Swagger/OpenAPI
            let requestBody: any = null;
            let requestHeaders: any = null;
            if (details.requestBody && details.requestBody.content) {
              const reqContent = details.requestBody.content;
              const mediaTypeKey = Object.keys(reqContent).find((mediaType) => mediaType.toLowerCase().includes('application/json')) || Object.keys(reqContent)[0];
              const media = reqContent[mediaTypeKey];
              if (media) {
                if (media.example !== undefined) {
                  requestBody = JSON.stringify(media.example, null, 2);
                } else if (media.examples) {
                  const exKey = Object.keys(media.examples)[0];
                  const ex = media.examples[exKey];
                  if (ex && ex.value) requestBody = JSON.stringify(ex.value, null, 2);
                } else if (media.schema) {
                  const example = buildExampleFromSchema(media.schema);
                  if (example !== null) requestBody = JSON.stringify(example, null, 2);
                } else if (mediaTypeKey.toLowerCase().includes('x-www-form-urlencoded') || mediaTypeKey.toLowerCase().includes('formdata')) {
                  requestBody = JSON.stringify({ example: 'value' }, null, 2);
                }
              }
            }

            // Extract header parameters as requestHeaders
            if (details.parameters && Array.isArray(details.parameters)) {
              const hdrs: any = {};
              for (const p of details.parameters) {
                if (p.in === 'header' && p.name) {
                  hdrs[p.name] = p.example || (p.schema && p.schema.example) || '';
                }
              }
              if (Object.keys(hdrs).length > 0) requestHeaders = JSON.stringify(hdrs, null, 2);
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
    } else if (parsedData.info && parsedData.item) {
      // POSTMAN COLLECTION FORMAT
      // Extract variables if any
      const postmanVars: Record<string, string> = {};
      if (parsedData.variable && Array.isArray(parsedData.variable)) {
        for (const v of parsedData.variable) {
          if (v.key && v.value) postmanVars[v.key] = v.value;
        }
      }

      const extractPostmanEndpoints = (items: any[]) => {
        let eps: any[] = [];
        for (const item of items) {
          if (item.request) {
            const method = item.request.method;
            let path = '';
            if (typeof item.request.url === 'string') {
              path = item.request.url;
            } else if (item.request.url && item.request.url.raw) {
              path = item.request.url.raw;
            }

            // Replace postman variables in the path with actual values from the collection
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
              } else if (item.request.body.urlencoded && Array.isArray(item.request.body.urlencoded)) {
                const formed: any = {};
                for (const field of item.request.body.urlencoded) {
                  if (field.key) {
                    formed[field.key] = field.value || '';
                  }
                }
                requestBody = JSON.stringify(formed, null, 2);
              } else if (item.request.body.formdata && Array.isArray(item.request.body.formdata)) {
                const formed: any = {};
                for (const field of item.request.body.formdata) {
                  if (field.key) {
                    formed[field.key] = field.value || (field.src ? `<file:${field.src}>` : '');
                  }
                }
                requestBody = JSON.stringify(formed, null, 2);
              } else if (item.request.body.file) {
                requestBody = item.request.body.file.src || '<file>';
              }
            }

            let requestHeaders = null;
            if (item.request.header && Array.isArray(item.request.header)) {
               const headerObj: any = {};
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
    } catch (error: any) {
      throw new BadRequestException(`Failed to process upload: ${error.message}`);
    }
  }

  @Post('audit-log')
  async logAudit(@Body() body: any, @Headers() headers: any) {
    const maskSensitiveData = (data: string): string => {
      if (!data) return data;
      let masked = data;
      // Mask common sensitive fields
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
        action: body.action, // login, test_request, upload, etc.
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

  @Get('audit-logs')
  async getAuditLogs(@Query('limit') limit?: number, @Query('offset') offset?: number) {
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

  @Get('test-history/:projectId')
  async getTestHistory(@Param('projectId') projectId: string) {
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

  // Project Access Management - Admin Only
  @Get('projects/:projectId/access')
  async getProjectAccess(
    @Param('projectId') projectId: string,
    @Headers('authorization') authHeader?: string
  ) {
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
      } catch (e) {}
    }

    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Only admins can view project access');
    }

    const accesses = await (this.prisma as any).projectAccess.findMany({
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

  @Post('projects/:projectId/access')
  async grantProjectAccess(
    @Param('projectId') projectId: string,
    @Body('userId') userId: string,
    @Body('accessRole') accessRole: string = 'VIEWER',
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Only admins can grant project access');
    }

    if (!['VIEWER', 'EDITOR', 'ADMIN'].includes(accessRole)) {
      throw new BadRequestException('Invalid access role');
    }

    // Check if project exists
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    if (userId === 'all') {
      try {
        const allUsers = await this.prisma.user.findMany({ select: { id: true } });
        const results = [];
        for (const u of allUsers) {
          const access = await (this.prisma as any).projectAccess.upsert({
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
      } catch (error: any) {
        throw new BadRequestException(`Failed to grant access to all users: ${error.message}`);
      }
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    try {
      const access = await (this.prisma as any).projectAccess.upsert({
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
} catch (error: any) {
      throw new BadRequestException(`Failed to grant access: ${error.message}`);
    }
  }

  @Delete('projects/:projectId/access/:userId')
  async revokeProjectAccess(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Only admins can revoke project access');
    }

    try {
      await (this.prisma as any).projectAccess.delete({
        where: { projectId_userId: { projectId, userId } }
      });

      return { message: 'Access revoked successfully' };
    } catch (error) {
      throw new BadRequestException('Access record not found');
    }
  }

  @Get('users')
  async getAllUsers(
    @Headers('authorization') authHeader?: string,
    @Query('search') search?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Only admins can view all users');
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

  @Post('users')
  async createUser(
    @Body() body: any,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Only admins can create users');
    }

    const { email, name, password, role } = body;
    if (!email || !name || !password) {
      throw new BadRequestException('Email, name, and password are required');
    }

    if (!['GUEST', 'DEVELOPER', 'ADMIN'].includes(role)) {
      throw new BadRequestException('Role must be GUEST, DEVELOPER, or ADMIN');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
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

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: any,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Only admins can update users');
    }

    const { name, role } = body;
    const updateData: any = {};
    if (name) updateData.name = name;
    if (role && ['GUEST', 'DEVELOPER', 'ADMIN'].includes(role)) updateData.role = role;

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

  @Delete('users/:id')
  async deleteUser(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Only admins can delete users');
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: 'User deleted successfully' };
  }

  @Get('users/:id/projects')
  async getUserProjects(
    @Param('id') userId: string,
    @Headers('authorization') authHeader?: string
  ) {
    let userRole = 'GUEST';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (decoded && decoded.role) {
          userRole = decoded.role;
        }
      } catch (e) {}
    }

    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Only admins can view user projects');
    }

    const accesses = await (this.prisma as any).projectAccess.findMany({
      where: { userId },
      include: {
        project: {
          select: { id: true, name: true, description: true }
        }
      }
    });

    return accesses;
  }
}
