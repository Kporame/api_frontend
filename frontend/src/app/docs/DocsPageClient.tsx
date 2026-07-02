"use client";

import { useState } from "react";
import EndpointTester from "./EndpointTester";
import VersionSelector from "../../components/VersionSelector";
import DocsToolbar from "./DocsToolbar";
import VisibilityToggle from "./VisibilityToggle";
import FolderVisibilityToggle from "./FolderVisibilityToggle";
import EndpointSchemaViewer from "./EndpointSchemaViewer";
import Sidebar from "../Sidebar";
import GithubSyncPanel from "./GithubSyncPanel";

interface DocsClientProps {
  projectId: string | null;
  version: string | null;
  endpointData: any;
  projectInfo: any;
  token: string | null;
  user: any;
}

export default function DocsPageClient({
  projectId,
  version,
  endpointData,
  projectInfo,
  token,
  user
}: DocsClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return "bg-green-500/10 text-green-500 border-green-500/20";
      case 'POST': return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case 'PUT': return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case 'DELETE': return "bg-red-500/10 text-red-500 border-red-500/20";
      case 'PATCH': return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar isAdmin={user?.role === 'ADMIN'} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Hamburger + Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-8 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 gap-2 md:gap-0">
          {/* Mobile Hamburger Button */}
          <div className="md:hidden flex items-center w-full gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1">
              <h1 className="text-base font-semibold">
                {projectInfo?.name ? `📚 ${projectInfo.name}` : "เอกสาร API"}
              </h1>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block flex-1 w-full">
            <h1 className="text-lg font-semibold">
              {projectInfo?.name ? `📚 ${projectInfo.name} - เอกสาร API` : "เอกสาร API"}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-xs text-muted-foreground">
                มี {endpointData.endpoints?.length || 0} endpoint ให้ใช้งาน
              </p>
              {endpointData.fileType && (
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  endpointData.fileType === 'swagger'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-orange-500/10 text-orange-500'
                }`}>
                  {endpointData.fileType === 'swagger' ? '🔷 Swagger' : '🔶 Postman'}
                </span>
              )}
            </div>
          </div>

          {projectInfo && (
            <VersionSelector
              versions={projectInfo.documents}
              currentVersion={version || ""}
              projectId={projectId || ""}
            />
          )}
        </header>

        {/* Documentation Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-12 md:space-y-16 pb-24">

            {/* Intro Section */}
            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">🔌 ข้อมูลอ้างอิง API</h2>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
                ด้านล่างเป็น endpoint ที่ถูกแยกข้อมูลจากเอกสารที่นำเข้า ทดสอบตรงนี้หรือคัดลอกตัวอย่างโค้ดตามภาษาได้ทันที
              </p>
            </section>

            <DocsToolbar />

            {projectInfo && (
              <GithubSyncPanel
                projectId={projectId || ""}
                initialGithubUrl={projectInfo.githubUrl || ""}
                initialDomainUrl={projectInfo.domainUrl || ""}
                initialDocumentUrl={projectInfo.documentUrl || ""}
                token={token}
                userRole={user?.role || null}
              />
            )}

            {/* Endpoints Section */}
            {endpointData.endpoints && endpointData.endpoints.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Endpoints</h2>
                <div className="space-y-4">
                  {endpointData.endpoints.map((endpoint: any, idx: number) => (
                    <div key={idx} className="border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                      <div className="p-4 bg-muted/30">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span className={`px-3 py-1 rounded font-semibold text-sm border ${getMethodColor(endpoint.method)}`}>
                            {endpoint.method?.toUpperCase()}
                          </span>
                          <code className="flex-1 font-mono text-sm text-foreground break-all">{endpoint.path}</code>
                          {endpoint.isPublic !== false && (
                            <VisibilityToggle
                              endpointId={endpoint.id}
                              currentVisibility={endpoint.visibility || 'PUBLIC'}
                              token={token}
                            />
                          )}
                        </div>
                        {endpoint.summary && (
                          <p className="text-sm text-muted-foreground mb-2">{endpoint.summary}</p>
                        )}
                      </div>

                      <div className="p-4 space-y-4">
                        <EndpointTester endpoint={endpoint} projectId={projectId} />

                        {endpoint.requestSchema && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Request</h4>
                            <EndpointSchemaViewer schema={endpoint.requestSchema} />
                          </div>
                        )}

                        {endpoint.responseSchema && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Response</h4>
                            <EndpointSchemaViewer schema={endpoint.responseSchema} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
