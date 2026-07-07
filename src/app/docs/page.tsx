import Link from "next/link";
import EndpointTester from "./EndpointTester";
import VersionSelector from "../../components/VersionSelector";
import { cookies } from "next/headers";
import { DocsProvider } from "./DocsContext";
import DocsToolbar from "./DocsToolbar";
import VisibilityToggle from "./VisibilityToggle";
import FolderVisibilityToggle from "./FolderVisibilityToggle";
import EndpointSchemaViewer from "./EndpointSchemaViewer";
import Sidebar from "../Sidebar";
import GithubSyncPanel from "./GithubSyncPanel";
import DocsHeaderClient from "./DocsHeaderClient";
import { getApiUrl } from "@/lib/api";

export const dynamic = 'force-dynamic';

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

export default async function DocsPage({ searchParams }: { searchParams: Promise<{ project?: string, version?: string }> }) {
  let endpointData: any = {};
  let projectInfo: any = null;
  const params = await searchParams;
  const projectId = params.project;
  const version = params.version;

  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || null;
  const userCookie = cookieStore.get('user')?.value;
  let user = null;
  if (userCookie) {
    try { user = JSON.parse(decodeURIComponent(userCookie)); } catch (e) {}
  }
  
  const headers: any = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  if (projectId) {
    try {
      const resProj = await fetch(getApiUrl(`/api/projects/${projectId}`), { 
        cache: 'no-store',
        headers 
      });
      if (resProj.ok) projectInfo = await resProj.json();

      const url = version 
        ? getApiUrl(`/api/projects/${projectId}/endpoints?version=${version}`)
        : getApiUrl(`/api/projects/${projectId}/endpoints`);

      const res = await fetch(url, { 
        cache: 'no-store',
        headers 
      });
      if (res.ok) {
        endpointData = await res.json();
      }
    } catch (error) {
      console.error("Failed to fetch endpoints:", error);
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      {/* Unified Sidebar */}
      <Sidebar isAdmin={user?.role === 'ADMIN'} isOpen={false} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header with Mobile Menu */}
        <DocsHeaderClient
          projectInfo={projectInfo}
          endpointData={endpointData}
          version={version}
          projectId={projectId}
        />

        {/* Documentation Content */}
        <DocsProvider>
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

            <hr className="border-border" />

            {/* Endpoints */}
            {!endpointData.endpoints || endpointData.endpoints.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-lg">ยังไม่มี endpoint ให้ใช้งาน</p>
                <p className="text-sm mt-2">โปรเจกต์นี้อาจยังไม่มี endpoint หรือถูกตั้งเป็น <strong>Private</strong> ซึ่งต้องใช้การล็อกอินเพื่อดู</p>
              </div>
            )}
            
            {endpointData.endpoints && endpointData.endpoints.length > 0 && user?.role && (user.role === 'ADMIN' || user.role === 'DEVELOPER') && (
              <div className="flex justify-end mb-4">
                <FolderVisibilityToggle 
                  endpointIds={endpointData.endpoints.map((ep: any) => ep.id)} 
                  userRole={user.role} 
                  loginToken={token} 
                />
              </div>
            )}

            {endpointData.endpoints && endpointData.endpoints.map((ep: any, idx: number) => (
              <section key={ep.id} id={ep.id} className="scroll-mt-24">
                <div className="space-y-6">
                  {/* Header with Title and Visibility */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        <span className={`px-3 py-1.5 text-[11px] font-bold rounded-md uppercase tracking-wider ${getMethodColor(ep.method)}`}>
                          {ep.method}
                        </span>
                        {ep.title}
                      </h3>
                      <p className="text-muted-foreground mb-3">{ep.description}</p>
                      <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border">
                        <span className="text-sm font-mono text-foreground break-all">{ep.path}</span>
                        <VisibilityToggle 
                          endpointId={ep.id} 
                          initialIsPublic={ep.isPublic} 
                          userRole={user?.role || null} 
                          loginToken={token} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Schema Viewer and Interactive Tester */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-sm font-semibold mb-4 text-primary">📋 API Schema</h4>
                      <EndpointSchemaViewer endpoint={ep} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-4 text-primary">🧪 Try It Out</h4>
                      <EndpointTester ep={ep} />
                    </div>
                  </div>
                </div>
                
                {idx !== endpointData.endpoints.length - 1 && (
                  <hr className="border-border my-12" />
                )}
              </section>
            ))}
            
            </div>
          </div>
        </DocsProvider>
      </main>
    </div>
  );
}
