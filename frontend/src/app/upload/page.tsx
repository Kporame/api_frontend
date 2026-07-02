"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../Sidebar";

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [teamName, setTeamName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [grantRole, setGrantRole] = useState("DEVELOPER");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const getCookieValue = (name: string) => {
    if (typeof document === 'undefined') return null;
    const cookie = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));
    return cookie ? cookie.split('=')[1] : null;
  };

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(userJson);
      if (!parsed || parsed.role === 'GUEST') {
        router.push('/login');
        return;
      }
      setUser(parsed);
      setToken(localStorage.getItem('token'));
    } catch (error) {
      router.push('/login');
    }
  }, [router]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setUploadResult(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    if (teamName.trim()) formData.append('teamName', teamName.trim());
    if (projectName.trim()) formData.append('projectName', projectName.trim());
    if (version.trim()) formData.append('version', version.trim());
    if (grantRole) formData.append('grantRole', grantRole);

    try {
      const response = await fetch('http://localhost:4010/api/upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();
      setUploadResult({ success: response.ok, message: data.message });
      if (response.ok) {
         setFile(null); // clear after success
         setTeamName("");
         setProjectName("");
         setVersion("1.0.0");
         // Auto redirect to Projects page after 2 seconds
         setTimeout(() => {
           router.push('/');
         }, 2000);
      }
    } catch (error) {
      setUploadResult({ success: false, message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์หลังบ้านได้' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isAdmin={user?.role === 'ADMIN'} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-8 border-b border-border bg-background gap-2">
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base font-semibold">อัปโหลด</h1>
          </div>

          <h1 className="hidden md:block text-lg font-semibold">อัปโหลดเอกสาร API</h1>
          <div className="flex items-center gap-4">
             {/* Optional Header Actions */}
          </div>
        </header>

        {/* Upload Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">นำเข้า API สเปก</h2>
              <p className="text-sm md:text-base text-muted-foreground">อัปโหลดและจัดหมวดหมู่เอกสาร Postman หรือ Swagger (OpenAPI)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
               <div className="space-y-2">
                 <label className="text-sm font-medium">ทีม / โฟลเดอร์</label>
                 <input 
                   type="text" 
                   placeholder="เช่น Core Team, Logistic Dept" 
                   value={teamName}
                   onChange={(e) => setTeamName(e.target.value)}
                   className="w-full bg-muted border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium">ชื่อโปรเจกต์ (ไม่บังคับ)</label>
                 <input 
                   type="text" 
                   placeholder="เว้นว่างเพื่อใช้ชื่อไฟล์" 
                   value={projectName}
                   onChange={(e) => setProjectName(e.target.value)}
                   className="w-full bg-muted border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                 />
               </div>
               <div className="space-y-2 md:col-span-2">
                 <label className="text-sm font-medium">เวอร์ชัน API</label>
                 <input 
                   type="text" 
                   placeholder="เช่น 1.0.0" 
                   value={version}
                   onChange={(e) => setVersion(e.target.value)}
                   className="w-full bg-muted border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                 />
               </div>
               <div className="space-y-2 md:col-span-2">
                 <label className="text-sm font-medium">ให้สิทธิ์เข้าดูแก่</label>
                 <select
                   value={grantRole}
                   onChange={(e) => setGrantRole(e.target.value)}
                   className="w-full bg-muted border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                 >
                   <option value="GUEST">ผู้ใช้งานภายนอก (Guest)</option>
                   <option value="DEVELOPER">นักพัฒนา</option>
                   <option value="ADMIN">เฉพาะผู้ดูแลระบบ</option>
                 </select>
                 <p className="text-xs text-muted-foreground mt-1">ผู้ดูแลระบบได้รับสิทธิ์เสมอ</p>
               </div>
            </div>

            <div 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                isDragging 
                  ? "border-primary bg-primary/5 scale-105" 
                  : "border-border hover:border-primary/50 hover:bg-card"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">คลิกเพื่อนำเข้า หรือลากแล้ววาง</h3>
              <p className="text-sm text-muted-foreground mb-6">JSON หรือ YAML (สูงสุด 10MB)</p>
              
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".json,.yaml,.yml"
                onChange={handleFileChange}
              />
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                เลือกไฟล์
              </label>
            </div>

            {file && (
              <div className="mt-8 p-4 bg-card border border-border rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => setFile(null)}
                  className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            )}

            {file && (
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8 py-2"
                >
                  {isUploading ? 'กำลังนำเข้า...' : 'นำเข้าเอกสาร'}
                </button>
              </div>
            )}

            {uploadResult && (
              <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${uploadResult.success ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {uploadResult.success ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                )}
                <span className="text-sm font-medium">{uploadResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
