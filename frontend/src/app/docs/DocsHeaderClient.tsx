"use client";

import { useState } from "react";
import VersionSelector from "../../components/VersionSelector";
import Sidebar from "../Sidebar";

interface DocsHeaderClientProps {
  projectInfo: any;
  endpointData: any;
  version: string | null | undefined;
  projectId: string | null | undefined;
}

export default function DocsHeaderClient({
  projectInfo,
  endpointData,
  version,
  projectId
}: DocsHeaderClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile Sidebar with Overlay */}
      <Sidebar isAdmin={false} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-8 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 gap-2 md:gap-0 py-3 md:py-0 md:h-16">
        {/* Mobile Menu Button + Title */}
        <div className="md:hidden flex items-center gap-3 w-full">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="text-sm font-semibold flex-1 truncate">
            {projectInfo?.name ? `📚 ${projectInfo.name}` : "API"}
          </h1>
        </div>

        {/* Desktop Title */}
        <div className="hidden md:block flex-1 w-full">
          <h1 className="text-lg font-semibold">
            {projectInfo?.name ? `📚 ${projectInfo.name} - เอกสาร API` : "เอกสาร API"}
          </h1>
          <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
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
    </>
  );
}
