"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

export default function HomePageClient({ 
  teams, 
  userRole, 
  userName, 
  token,
  children 
}: { 
  teams: any[],
  userRole: string | null,
  userName: string,
  token: string | null,
  children: React.ReactNode 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isAdmin={userRole === 'ADMIN'} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Hamburger Button */}
        <div className="md:hidden h-12 flex items-center px-4 bg-background">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {children}
      </main>
    </div>
  );
}
