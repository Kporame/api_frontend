"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface SidebarProps {
  isAdmin?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isAdmin = false, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (userJson) {
      try {
        setUser(JSON.parse(userJson));
      } catch (e) {}
    }
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || (!pathname.startsWith("/admin") && !pathname.startsWith("/docs") && !pathname.startsWith("/upload") && !pathname.startsWith("/access-control"));
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static w-64 h-screen md:h-screen border-r border-border bg-card flex flex-col overflow-hidden shrink-0 transition-transform duration-300 z-50 ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 md:px-6 border-b border-border">
        <span className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
          API Portal
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 md:px-4 py-6 space-y-2 overflow-y-auto">
        <Link
          href="/"
          className={`flex items-center gap-2 px-2 md:px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive("/")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          📁 ไดเรกทอรีโปรเจกต์
        </Link>

        <Link
          href="/upload"
          className={`flex items-center gap-2 px-2 md:px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive("/upload")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          📄 อัปโหลดเอกสาร
        </Link>

        <Link
          href="/access-control"
          className={`flex items-center gap-2 px-2 md:px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive("/access-control")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          🔐 จัดการการเข้าถึง
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-2 px-2 md:px-3 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
              isActive("/admin")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            👥 จัดการผู้ใช้
          </Link>
        )}
      </nav>

      {/* User Info & Sign Out / Login */}
      <div className="p-4 border-t border-border flex flex-col gap-2">
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-sm min-w-0">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground uppercase truncate">{user.role}</p>
            </div>
          </div>
        )}
        {user ? (
          <Link
            href="/login?logout=true"
            className="flex items-center justify-center w-full px-3 py-1.5 text-xs font-medium rounded-md text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors"
          >
            ออกจากระบบ
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center w-full px-3 py-1.5 text-xs font-medium rounded-md text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 transition-colors"
          >
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </aside>
    </>
  );
}
