"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProjectVisibilityToggle({ 
  projectId, 
  initialVisibility, 
  userRole, 
  loginToken 
}: { 
  projectId: string, 
  initialVisibility: string, 
  userRole: string | null, 
  loginToken: string | null 
}) {
  const [visibility, setVisibility] = useState(initialVisibility);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<string | null>(userRole);
  const [token, setToken] = useState<string | null>(loginToken);
  const router = useRouter();

  useEffect(() => {
    if (!role) {
      const userJson = localStorage.getItem("user");
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          setRole(user.role || null);
        } catch (e) {}
      }
    }
    if (!token) {
      setToken(localStorage.getItem("token"));
    }
  }, [role, token]);

  const canEdit = role?.toUpperCase() === 'ADMIN' || role?.toUpperCase() === 'DEVELOPER';

  const toggleVisibility = async () => {
    if (!canEdit) return;
    
    setIsLoading(true);
    // Cycle through: INTERNAL -> PUBLIC -> PRIVATE -> INTERNAL
    const nextVisibility = visibility === 'INTERNAL' ? 'PUBLIC' : visibility === 'PUBLIC' ? 'PRIVATE' : 'INTERNAL';
    
    try {
      const res = await fetch(`http://localhost:4010/api/projects/${projectId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ visibility: nextVisibility })
      });
      
      if (res.ok) {
        setVisibility(nextVisibility);
        router.refresh();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVisibilityBadge = () => {
    if (visibility === 'PUBLIC') {
      return (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1 ${canEdit && !isLoading ? 'cursor-pointer hover:bg-green-500/20' : ''} ${isLoading ? 'opacity-50' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
          สาธารณะ
        </span>
      );
    } else if (visibility === 'PRIVATE') {
      return (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1 ${canEdit && !isLoading ? 'cursor-pointer hover:bg-red-500/20' : ''} ${isLoading ? 'opacity-50' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          ส่วนตัว
        </span>
      );
    } else {
      return (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1 ${canEdit && !isLoading ? 'cursor-pointer hover:bg-blue-500/20' : ''} ${isLoading ? 'opacity-50' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2-9 5 18 2-9h5"/></svg>
          ภายใน
        </span>
      );
    }
  };

  if (!canEdit) {
    return getVisibilityBadge();
  }

  return (
    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleVisibility(); }} disabled={isLoading} title="คลิกเพื่อเปลี่ยนการมองเห็น (สาธารณะ = อ่านได้ไม่ต้องล็อกอิน)">
      {getVisibilityBadge()}
    </button>
  );
}
