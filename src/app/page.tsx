import Link from "next/link";
import { Suspense } from "react";
import SearchBar from "../components/SearchBar";
import { cookies } from "next/headers";
import ProjectVisibilityToggle from "./ProjectVisibilityToggle";
import DeleteProjectButton from "./DeleteProjectButton";
import HomePageClient from "./HomePageClient";
import { getApiUrl } from "@/lib/api";

export const dynamic = 'force-dynamic';

interface Project {
  id: string;
  name: string;
  description?: string;
  domainUrl?: string;
  documentUrl?: string;
  githubUrl?: string;
  visibility?: string;
  documents?: Array<{ endpoints?: any[]; fileType?: string }>;
}

interface Team {
  id: string;
  name: string;
  projects: Project[];
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  let teams: Team[] = [];
  const params = await searchParams;
  const search = params.search || '';
  
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const userCookie = cookieStore.get('user')?.value;
  let user = null;
  if (userCookie) {
    try { user = JSON.parse(decodeURIComponent(userCookie)); } catch (e) {}
  }

  try {
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(getApiUrl(`/api/projects?search=${encodeURIComponent(search)}`), { 
     cache: 'no-store',
     headers 
    });
    if (res.ok) {
     teams = await res.json();
    }
  } catch (error) {
    console.error("Failed to fetch teams:", error);
  }

  return (
    <HomePageClient 
     teams={teams} 
     userRole={user?.role || null} 
     userName={user?.name || ''} 
     token={token || null}
    >
     {/* Header */}
     <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-background">
       <h1 className="text-lg font-semibold">โปรเจกต์</h1>
       <Suspense fallback={<div className="w-96 h-9 bg-muted rounded-full animate-pulse"></div>}>
         <SearchBar />
       </Suspense>
     </header>

     {/* Directory Content */}
     <div className="flex-1 overflow-auto p-8">
       <div className="max-w-5xl mx-auto space-y-12">
         {teams.length === 0 && (
           <div className="text-center py-20 text-muted-foreground">
             <p>ยังไม่มีโปรเจกต์ ลองอัปโหลดเอกสารดู!</p>
           </div>
         )}
         {teams.map((team) => (
           <section key={team.id}>
             <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
               <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
               {team.name}
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {team.projects.map((project) => (
                 <div key={project.id} className="group flex flex-col bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300">
                   <div className="flex-1">
                     <div className="flex items-center justify-between mb-2">
                       <h3 className="text-lg font-semibold group-hover:text-primary transition-colors truncate">{project.name}</h3>
                        <div className="flex items-center gap-2">
                          <ProjectVisibilityToggle 
                            projectId={project.id} 
                            initialVisibility={project.visibility || 'PUBLIC'} 
                            userRole={user?.role || null} 
                            loginToken={token ?? null} 
                          />
                          <DeleteProjectButton 
                            projectId={project.id}
                            projectName={project.name}
                          />
                        </div>
                     </div>
                     <p className="text-sm text-muted-foreground line-clamp-2">{project.description || "ยังไม่มีคำอธิบาย"}</p>
                      
                     {/* Project Resource Links */}
                     <div className="mt-4 flex flex-wrap gap-2">
                       {project.domainUrl && (
                         <a href={project.domainUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                           โดเมน
                         </a>
                       )}
                       {project.documentUrl && (
                         <a href={project.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                           เอกสาร
                         </a>
                       )}
                       {project.githubUrl && (
                         <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                           ที่เก็บโค้ด
                         </a>
                       )}
                     </div>

                     <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <span className="text-xs text-muted-foreground">Endpoints:</span>
                         <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-full">{project.documents?.[0]?.endpoints?.length || 0}</span>
                         {project.documents?.[0]?.fileType && (
                           <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                             project.documents[0].fileType === 'swagger' 
                               ? 'bg-blue-500/10 text-blue-500' 
                               : 'bg-orange-500/10 text-orange-500'
                           }`}>
                             {project.documents[0].fileType === 'swagger' ? '🔷 Swagger' : '🔶 Postman'}
                           </span>
                         )}
                       </div>
                       <Link href={`/docs?project=${project.id}`} className="text-sm font-medium text-primary hover:text-blue-400 flex items-center gap-1 transition-colors">
                         ดูเอกสาร API
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                       </Link>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </section>
         ))}
       </div>
     </div>
    </HomePageClient>
  );
}
