"use client";

import { useState, useEffect } from "react";

export default function FolderVisibilityToggle({ 
  endpointIds, 
  userRole, 
  loginToken 
}: { 
  endpointIds: string[], 
  userRole: string | null, 
  loginToken: string | null 
}) {
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

  const toggleBulkVisibility = async (isPublic: boolean) => {
    if (!canEdit || endpointIds.length === 0) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:4010/api/endpoints/bulk-visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ endpointIds, isPublic })
      });
      
      if (res.ok) {
        // Force refresh the page to update documentation view immediately
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-2 ml-4">
      <button 
        onClick={() => toggleBulkVisibility(true)}
        disabled={isLoading}
        className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:bg-green-500/20 bg-green-500/10 text-green-500 border-green-500/20'}`}
        title="Set all endpoints in this folder to Public"
      >
        Set All Public
      </button>
      <button 
        onClick={() => toggleBulkVisibility(false)}
        disabled={isLoading}
        className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:bg-red-500/20 bg-red-500/10 text-red-500 border-red-500/20'}`}
        title="Set all endpoints in this folder to Private"
      >
        Set All Private
      </button>
    </div>
  );
}
