"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminLayout from "../../AdminLayout";
import { getApiUrl } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface ProjectAccess {
  projectId: string;
  role: string;
  project: Project;
}

function UserDetailContent() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [userProjects, setUserProjects] = useState<ProjectAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!storedToken || !user) {
      router.push("/login");
      return;
    }

    try {
      const userData = JSON.parse(user);
      if (userData.role !== "ADMIN") {
        router.push("/");
        return;
      }
    } catch (e) {
      router.push("/login");
      return;
    }

    setToken(storedToken);
    fetchData(storedToken);
  }, [router, userId]);

  const fetchData = async (authToken: string) => {
    try {
      setLoading(true);

      // Fetch all users to get user details
      const usersRes = await fetch(getApiUrl("/api/users"), {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!usersRes.ok) throw new Error("Failed to fetch users");
      const users = await usersRes.json();
      const user = users.find((u: any) => u.id === userId);

      if (!user) throw new Error("User not found");

      setUserName(user.name);
      setUserEmail(user.email);
      setUserRole(user.role);

      // Fetch all projects
      const projectsRes = await fetch(getApiUrl("/api/projects"), {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      let projects: Project[] = [];
      if (projectsRes.ok) {
        const teams = await projectsRes.json();
        teams.forEach((team: any) => {
          team.projects.forEach((proj: any) => {
            projects.push({
              id: proj.id,
              name: proj.name,
              description: proj.description,
            });
          });
        });
      }
      setAllProjects(projects);

      // Fetch user's project accesses
      const accessRes = await fetch(getApiUrl(`/api/users/${userId}/projects`), {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (accessRes.ok) {
        const accesses = await accessRes.json();
        setUserProjects(accesses);
        setSelectedProjects(accesses.map((a: any) => a.projectId));
      }

      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSaveProjects = async () => {
    try {
      setSaving(true);
      // Get current projects
      const currentProjectIds = userProjects.map((p) => p.projectId);

      // Projects to remove
      const toRemove = currentProjectIds.filter((id) => !selectedProjects.includes(id));

      // Projects to add
      const toAdd = selectedProjects.filter((id) => !currentProjectIds.includes(id));

      // Remove revoked access
      for (const projectId of toRemove) {
        await fetch(getApiUrl(`/api/projects/${projectId}/access/${userId}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Add new access
      for (const projectId of toAdd) {
        await fetch(getApiUrl(`/api/projects/${projectId}/access`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, accessRole: "VIEWER" }),
        });
      }

      // Refresh data
      await fetchData(token);
      alert("บันทึกโปรเจกต์สำเร็จแล้ว!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Page Header */}
      <div className="h-16 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-8 border-b border-border bg-background gap-2">
        <div className="flex items-center gap-2 md:gap-4 w-full">
          <a
            href="/admin"
            className="text-sm md:text-base text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            ← ย้อนกลับ
          </a>
          <h1 className="text-base md:text-lg font-semibold">จัดการโปรเจกต์ของผู้ใช้</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            {/* User Info */}
            {!loading && (
              <div className="mb-6 md:mb-8 p-4 md:p-6 bg-muted/50 border border-border rounded-lg">
                <h2 className="text-base md:text-lg font-semibold mb-4">ข้อมูลผู้ใช้</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">ชื่อ</p>
                    <p className="text-sm md:text-base font-medium break-all">{userName}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">อีเมล</p>
                    <p className="text-sm md:text-base font-medium break-all">{userEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">บทบาท</p>
                    <p className="text-sm md:text-base font-medium">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          userRole === "ADMIN"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-blue-500/10 text-blue-500"
                        }`}
                      >
                        {userRole}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">โปรเจกต์ปัจจุบัน</p>
                    <p className="text-sm md:text-base font-medium">{selectedProjects.length} โปรเจกต์</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <p>Loading projects...</p>
              </div>
            ) : (
              <>
                {/* Projects Grid */}
                <div className="mb-8">
                  <h2 className="text-base md:text-lg font-semibold mb-4">โปรเจกต์ที่มีอยู่</h2>

                  {allProjects.length === 0 ? (
                    <div className="text-center py-12 text-xs md:text-sm text-muted-foreground border border-border rounded-lg">
                      <p>ยังไม่มีโปรเจกต์</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {allProjects.map((project) => (
                        <label
                          key={project.id}
                          className="flex items-start gap-3 p-3 md:p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProjects.includes(project.id)}
                            onChange={() => handleProjectToggle(project.id)}
                            className="mt-1 w-4 h-4 rounded border-border cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{project.name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {project.description || "No description"}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProjects}
                    disabled={saving}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                  </button>
                  <a
                    href="/admin"
                    className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors inline-block"
                  >
                    ยกเลิก
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
  );
}

export default function UserDetailPage() {
  return (
      <AdminLayout>
        <UserDetailContent />
      </AdminLayout>
  );
}
