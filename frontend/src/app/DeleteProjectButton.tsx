"use client";

import { useState, useEffect } from "react";

export default function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        const role = user.role?.toUpperCase();
        setCanDelete(role === 'ADMIN' || role === 'DEVELOPER');
      } catch (e) {}
    }
  }, []);

  if (!canDelete) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:4010/api/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete project");
      }

      setSuccessMessage("Project deleted successfully! Reloading...");
      
      // Force a full reload to clear Next.js router cache
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred");
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Trash button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setErrorMessage(null);
          setSuccessMessage(null);
          setShowModal(true);
        }}
        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
        title="Delete Project"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>

      {/* Custom Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => !isDeleting && setShowModal(false)}
          ></div>

          {/* Modal Container */}
          <div className="relative bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl z-10 transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              {/* Warning Icon Circle */}
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              {/* Title & Desc */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground truncate">
                  ลบโปรเจกต์
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  คุณแน่ใจหรือไม่ว่าจะลบโปรเจกต์ <strong className="text-foreground">"{projectName}"</strong>? 
                  การกระทำนี้จะลบเอกสาร API เวอร์ชัน และ endpoint ทั้งหมดอย่างถาวร และไม่สามารถกู้คืนได้
                </p>
              </div>
            </div>

            {/* Error or Success Alerts */}
            {errorMessage && (
              <div className="mt-4 p-3 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                ✕ {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="mt-4 p-3 rounded-lg text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                ✓ {successMessage}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-muted hover:bg-muted/80 disabled:opacity-50 text-foreground text-xs font-semibold rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800/50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Deleting...
                  </>
                ) : (
                  "Delete Project"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
