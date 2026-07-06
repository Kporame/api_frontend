"use client";

import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/api";

export default function VisibilityToggle({ 
  endpointId, 
  initialIsPublic, 
  userRole, 
  loginToken 
}: { 
  endpointId: string, 
  initialIsPublic: boolean, 
  userRole: string | null, 
  loginToken: string | null 
}) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<string | null>(userRole);
  const [token, setToken] = useState<string | null>(loginToken);

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
    try {
      const res = await fetch(getApiUrl(`/api/endpoints/${endpointId}/visibility`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ isPublic: !isPublic })
      });
      
      if (res.ok) {
        setIsPublic(!isPublic);
        // Force refresh the page to update documentation view immediately
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // If user cannot edit, just show the badge statically
  if (!canEdit) {
    if (!isPublic) {
      return (
        <span className="ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1 whitespace-nowrap" title="มองเห็นได้เฉพาะผู้ที่ล็อกอินแล้ว">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          ส่วนตัว
        </span>
      );
    }
    return (
      <span className="ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-500/10 text-green-500 border border-green-500/20 whitespace-nowrap" title="สาธารณะ: อ่านได้โดยไม่ต้องล็อกอิน">
        สาธารณะ
      </span>
    );
  }

  // If user can edit, make it a clickable button
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        toggleVisibility();
      }}
      disabled={isLoading}
      className={`ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full border flex items-center gap-1 whitespace-nowrap transition-colors ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:bg-opacity-20'} ${!isPublic ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'}`}
      title={`คลิกเพื่อเปลี่ยน (สาธารณะ = อ่านได้ไม่ต้องล็อกอิน)`}
    >
      {!isPublic ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          ส่วนตัว
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
          สาธารณะ
        </>
      )}
    </button>
  );
}
