"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { getApiUrl } from "@/lib/api";

export default function VersionSelector({ 
  versions, 
  currentVersion, 
  projectId 
}: { 
  versions: any[], 
  currentVersion: string, 
  projectId: string 
}) {
  const router = useRouter();
  const [canDelete, setCanDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const userJson = localStorage.getItem("user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        const role = user.role?.toUpperCase();
        setCanDelete(role === 'ADMIN' || role === 'DEVELOPER');
      } catch (e) {}
    }
  }, []);

  const displayVersion = currentVersion || versions?.[0]?.version || "1.0.0";
  const selectedDoc = versions?.find(v => v.version === displayVersion);
  const selectedDocId = selectedDoc?.id;

  const handleDeleteVersion = async () => {
    if (!selectedDocId) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl(`/api/projects/${projectId}/versions/${selectedDocId}`), {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete version");
      }

      setShowModal(false);
      
      // Redirect to main project docs page which will automatically load the next latest version
      router.push(`/docs?project=${projectId}`);
      // Force reload to refresh server data and clear Next.js client caching
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred");
      setIsDeleting(false);
    }
  };

  if (!versions || versions.length <= 1) {
    return (
      <div className="px-4 py-2 border-y border-border bg-muted/50 text-xs font-medium text-muted-foreground flex justify-between items-center">
        <span>Version</span>
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{versions?.[0]?.version || currentVersion || "1.0.0"}</span>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-2 border-y border-border bg-muted/20 text-xs font-medium text-muted-foreground flex justify-between items-center gap-3">
        <span>Version</span>
        <div className="flex items-center gap-2">
          <select 
            value={displayVersion}
            onChange={(e) => router.push(`/docs?project=${projectId}&version=${e.target.value}`)}
            className="bg-card border border-border text-foreground px-2 py-1 rounded text-xs focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.version}>
                v{v.version}
              </option>
            ))}
          </select>

          {/* Delete Version Button */}
          {canDelete && (
            <button
              onClick={() => {
                setErrorMessage(null);
                setShowModal(true);
              }}
              className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
              title={`Delete version v${displayVersion}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal - Rendered via Portal at document.body level */}
      {showModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowModal(false)}
          ></div>
          <div className="relative bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground">
                  Delete API Version
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete version <strong className="text-foreground">v{displayVersion}</strong>? 
                  This will permanently delete all endpoints associated with this version.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                ✕ {errorMessage}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-muted hover:bg-muted/80 disabled:opacity-50 text-foreground text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVersion}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800/50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Deleting...
                  </>
                ) : (
                  "Delete Version"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
