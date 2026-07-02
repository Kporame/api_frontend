'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../Sidebar';

export default function ProjectAccessManager() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projectAccess, setProjectAccess] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [accessRole, setAccessRole] = useState<string>('VIEWER');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [token, setToken] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : '';
    if (!authToken) {
      router.push('/login');
      return;
    }

    let role = '';
    try {
      if (userJson) {
        const user = JSON.parse(userJson);
        role = user.role || '';
        setUserRole(role);
      }
    } catch (e) { }

    setToken(authToken);
    setIsAuthorized(true);
    setError('');
    fetchProjects(authToken);
    fetchUsers(authToken);
  }, [router]);

  useEffect(() => {
    if (selectedProject && token && selectedProject !== 'all') {
      fetchProjectAccess(selectedProject, token);
    } else {
      setProjectAccess([]);
    }
  }, [selectedProject, token]);

  const fetchProjects = async (authToken: string) => {
    setError('');
    try {
      const res = await fetch('http://localhost:4010/api/projects', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(errorBody || 'Failed to fetch projects');
      }
      const data = await res.json();
      const allProjects = data.flatMap((team: any) => team.projects);
      setProjects(allProjects);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
    }
  };

  const fetchUsers = async (authToken: string) => {
    setError('');
    try {
      const res = await fetch('http://localhost:4010/api/users', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = 'Failed to fetch users';
        try {
          const errorBody = JSON.parse(errorText);
          errorMessage = errorBody.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    }
  };

  const fetchProjectAccess = async (projectId: string, authToken: string) => {
    setError('');
    try {
      const res = await fetch(`http://localhost:4010/api/projects/${projectId}/access`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch access list');
      }
      const data = await res.json();
      setProjectAccess(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch access list');
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedUser) {
      setError('กรุณาเลือกทั้งโปรเจกต์และผู้ใช้');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (selectedProject === 'all') {
        const grantPromises = projects.map((project) =>
          fetch(`http://localhost:4010/api/projects/${project.id}/access`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              userId: selectedUser,
              accessRole: accessRole
            })
          })
        );

        const results = await Promise.all(grantPromises);
        const failed = await Promise.all(
          results.map(async (res) => ({
            ok: res.ok,
            message: res.ok ? '' : (await res.text())
          }))
        );

        const failedItems = failed.filter((item) => !item.ok);
        if (failedItems.length > 0) {
          throw new Error(`Failed to grant access for ${failedItems.length} project(s)`);
        }

        setMessage('ให้สิทธิ์เข้าถึงสำเร็จสำหรับทุกโปรเจกต์!');
      } else {
        const res = await fetch(`http://localhost:4010/api/projects/${selectedProject}/access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: selectedUser,
            accessRole: accessRole
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to grant access');
        }

        setMessage('ให้สิทธิ์เข้าถึงสำเร็จ!');
        fetchProjectAccess(selectedProject, token);
      }

      setSelectedUser('');
      setAccessRole('VIEWER');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    if (!window.confirm('Are you sure you want to revoke access?')) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `http://localhost:4010/api/projects/${selectedProject}/access/${userId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) throw new Error('Failed to revoke access');

      setMessage('Access revoked successfully!');
      fetchProjectAccess(selectedProject, token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isAdmin={userRole === 'ADMIN'} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 flex flex-col md:flex-row items-start md:items-center px-4 md:px-8 border-b border-border bg-background gap-2">
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base font-semibold truncate">เข้าถึง</h1>
          </div>

          <h1 className="hidden md:block text-lg font-semibold">จัดการการเข้าถึงโปรเจกต์</h1>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
          <div className="max-w-5xl mx-auto space-y-6">
            {message && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 text-green-700 rounded-lg text-sm">
                ✓ {message}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 rounded-lg text-sm">
                ✕ {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Project Selection */}
              <div className="bg-card rounded-lg border border-border p-4 md:p-6">
                  <h2 className="text-base md:text-lg font-semibold mb-4 text-foreground">เลือกโปรเจกต์</h2>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">-- เลือกโปรเจกต์ --</option>
                    <option value="all">ทุกโปรเจกต์</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grant Access */}
              {selectedProject && (
                <div className="bg-card rounded-lg border border-border p-6">
                  <h2 className="text-lg font-semibold mb-4 text-foreground">ให้สิทธิ์การเข้าถึง</h2>
                  <form onSubmit={handleGrantAccess} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        ผู้ใช้
                      </label>
                      <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="">-- เลือกผู้ใช้ --</option>
                        <option value="all"> ผู้ใช้ทั้งหมด (ทุกคน)</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        บทบาทการเข้าถึงโปรเจกต์
                      </label>
                      <select
                        value={accessRole}
                        onChange={(e) => setAccessRole(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="VIEWER"> ผู้ชม (อ่านอย่างเดียว)</option>
                        <option value="EDITOR"> ผู้แก้ไข (อ่านและเขียน)</option>
                        <option value="ADMIN"> ผู้ดูแลระบบ (เข้าถึงทั้งหมด)</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">นี่คือระดับการเข้าถึงสำหรับโปรเจกต์ที่เลือก</p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary/80 disabled:bg-muted text-primary-foreground font-semibold py-2 px-4 rounded-lg transition"
                    >
                      {loading ? 'กำลังให้สิทธิ์...' : 'ให้สิทธิ์การเข้าถึง'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Current Access List */}
            {selectedProject && selectedProject !== 'all' && projectAccess.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold mb-4 text-foreground">สิทธิ์ปัจจุบัน</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 font-semibold text-foreground">ผู้ใช้</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">อีเมล</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">บทบาท</th>
                        <th className="text-left px-4 py-3 font-semibold text-foreground">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectAccess.map((access) => (
                        <tr key={access.id} className="border-b border-border hover:bg-muted/50 transition">
                          <td className="px-4 py-3 text-foreground">{access.user.name}</td>
                          <td className="px-4 py-3 text-muted-foreground text-sm">{access.user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${access.role === 'ADMIN'
                              ? 'bg-red-500/15 text-red-700'
                              : access.role === 'EDITOR'
                                ? 'bg-yellow-500/15 text-yellow-700'
                                : 'bg-blue-500/15 text-blue-700'
                              }`}>
                              {access.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRevokeAccess(access.user.id)}
                              disabled={loading}
                              className="px-3 py-1 text-sm font-medium bg-red-500/15 text-red-700 hover:bg-red-500/25 disabled:bg-muted disabled:text-muted-foreground rounded-lg transition"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedProject && selectedProject !== 'all' && projectAccess.length === 0 && (
              <div className="bg-muted/50 rounded-lg p-12 text-center text-muted-foreground border border-border">
                <p className="text-lg">ยังไม่มีผู้ใช้ที่ได้รับสิทธิ์สำหรับโปรเจกต์นี้</p>
                <p className="text-sm mt-2">ใช้แบบฟอร์มด้านบนเพื่อมอบสิทธิ์ให้ผู้ใช้</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
