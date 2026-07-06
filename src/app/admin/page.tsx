"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "../AdminLayout";
import { getApiUrl } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  projectAccesses?: { projectId: string }[];
}

function AdminPageContent() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "", role: "DEVELOPER" });

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
    fetchUsers(storedToken);
  }, [router]);

  const fetchUsers = async (authToken: string) => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl(`/api/users?search=${encodeURIComponent(search)}`), {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await res.json();
      setUsers(data);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/users"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Error: ${res.status}`);
      }

      setShowCreateModal(false);
      setNewUser({ email: "", name: "", password: "", role: "DEVELOPER" });
      setError("");
      fetchUsers(token);
    } catch (err: any) {
      console.error("Create user error:", err);
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?")) return;

    try {
      const res = await fetch(getApiUrl(`/api/users/${userId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete user");
      }

      fetchUsers(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  useEffect(() => {
    if (token) {
      fetchUsers(token);
    }
  }, [search]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Page Header */}
      <div className="h-16 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-8 border-b border-border bg-background gap-4 md:gap-0">
        <h1 className="text-lg font-semibold">จัดการผู้ใช้</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm w-full md:w-auto"
        >
            + เพิ่มผู้ใช้
        </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="ค้นหาผู้ใช้ด้วยอีเมลหรือชื่อ..."
              value={search}
              onChange={handleSearch}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Loading users...</p>
            </div>
          ) : (
            <>
          {/* Users Table */}
          <div className="overflow-x-auto border border-border rounded-lg text-sm md:text-base">
            <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">อีเมล</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-sm font-semibold">ชื่อ</th>
                      <th className="hidden lg:table-cell px-6 py-3 text-left text-sm font-semibold">บทบาท</th>
                      <th className="hidden lg:table-cell px-6 py-3 text-left text-sm font-semibold">โปรเจกต์</th>
                      <th className="hidden xl:table-cell px-6 py-3 text-left text-sm font-semibold">สร้างเมื่อ</th>
                      <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 md:px-6 py-4 md:py-8 text-center text-xs md:text-base text-muted-foreground">
                          ไม่พบผู้ใช้
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors text-xs md:text-sm">
                          <td className="px-3 md:px-6 py-2 md:py-3 font-medium break-all">{user.email}</td>
                          <td className="hidden md:table-cell px-6 py-3">{user.name}</td>
                          <td className="hidden lg:table-cell px-6 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                user.role === "ADMIN"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-blue-500/10 text-blue-500"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell px-6 py-3 text-muted-foreground">
                            {user.projectAccesses?.length || 0}
                          </td>
                          <td className="hidden xl:table-cell px-6 py-3 text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 md:px-6 py-2 md:py-3">
                            <div className="flex gap-1 md:gap-2">
                              <a
                                href={`/admin/${user.id}`}
                                className="px-2 md:px-3 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors whitespace-nowrap"
                              >
                                จัดการ
                              </a>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="px-2 md:px-3 py-1 text-xs bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors whitespace-nowrap"
                              >
                                ลบ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 md:p-8 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-6">สร้างผู้ใช้ใหม่</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">อีเมล</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@company.com"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">ชื่อ</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">รหัสผ่าน</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">บทบาทผู้ใช้</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="GUEST">Guest</option>
                  <option value="DEVELOPER">Developer</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">นี่คือบทบาทบัญชีผู้ใช้ในระบบ</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewUser({ email: "", name: "", password: "", role: "DEVELOPER" });
                  setError("");
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateUser}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                สร้างผู้ใช้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminLayout>
      <AdminPageContent />
    </AdminLayout>
  );
}
