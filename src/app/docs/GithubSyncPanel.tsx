"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api";

interface GithubSyncPanelProps {
  projectId: string;
  initialGithubUrl?: string;
  initialDomainUrl?: string;
  initialDocumentUrl?: string;
  token: string | null;
  userRole: string | null;
}

export default function GithubSyncPanel({
  projectId,
  initialGithubUrl = "",
  initialDomainUrl = "",
  initialDocumentUrl = "",
  token,
  userRole
}: GithubSyncPanelProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [githubUrl, setGithubUrl] = useState(initialGithubUrl);
  const [domainUrl, setDomainUrl] = useState(initialDomainUrl);
  const [documentUrl, setDocumentUrl] = useState(initialDocumentUrl);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canEdit = userRole === "ADMIN" || userRole === "DEVELOPER";
  const webhookUrl = getApiUrl(`/api/webhooks/github?projectId=${projectId}`);

  const handleSaveLinks = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(getApiUrl(`/api/projects/${projectId}/links`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          githubUrl,
          domainUrl,
          documentUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update project settings");
      }

      setMessage({ type: "success", text: "Project links updated successfully!" });
      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateWebhook = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "refs/heads/main",
          before: "61137788a27e253244588e001b5f21271167098e",
          after: "9049f166520625907400d72041b60d77121b6a1a",
          repository: {
            html_url: githubUrl || "https://github.com/company/simulated-repo",
          },
          head_commit: {
            id: "9049f166520625907400d72041b60d77121b6a1a",
            message: "feat: Add new endpoints to API specifications",
            timestamp: new Date().toISOString(),
            author: { name: "Developer Biza" },
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Webhook simulation failed");
      }

      const data = await res.json();
      setMessage({
        type: "success",
        text: `Webhook processed! Synced version ${data.oldVersion} -> ${data.newVersion}. Redirecting to updated specs...`,
      });

      // Wait a moment and redirect to the newly created version
      setTimeout(() => {
        router.push(`/docs?project=${projectId}&version=${data.newVersion}`);
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            🐙 GitHub Webhook Sync & Settings
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure repository webhooks to automatically sync API specifications on commit merge.
          </p>
        </div>
        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors"
          >
            ⚙️ Edit Settings
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            message.type === "success"
              ? "bg-green-500/10 text-green-500 border-green-500/20"
              : "bg-red-500/10 text-red-500 border-red-500/20"
          }`}
        >
          {message.type === "success" ? "✓ " : "✕ "}
          {message.text}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">GitHub Repository URL</label>
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Production Domain URL</label>
              <input
                type="text"
                value={domainUrl}
                onChange={(e) => setDomainUrl(e.target.value)}
                placeholder="https://api.example.com"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Internal Wiki / Docs Link</label>
              <input
                type="text"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://wiki.example.com"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-2 bg-muted text-foreground text-xs font-semibold rounded-md hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveLinks}
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-muted/30 p-4 rounded-lg border border-border">
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-1">GitHub Repository</span>
              {githubUrl ? (
                <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-xs truncate block">
                  {githubUrl}
                </a>
              ) : (
                <span className="text-muted-foreground text-xs italic">Not configured</span>
              )}
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-1">Domain URL</span>
              {domainUrl ? (
                <a href={domainUrl} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline font-mono text-xs truncate block">
                  {domainUrl}
                </a>
              ) : (
                <span className="text-muted-foreground text-xs italic">Not configured</span>
              )}
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-1">External Wiki / Notion</span>
              {documentUrl ? (
                <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline font-mono text-xs truncate block">
                  {documentUrl}
                </a>
              ) : (
                <span className="text-muted-foreground text-xs italic">Not configured</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border border-border border-dashed font-normal">
              <div className="flex-1 space-y-1">
                <span className="text-xs font-bold text-foreground block">Webhook Payload URL</span>
                <code className="text-[11px] font-mono text-primary bg-primary/5 px-2 py-1 rounded block break-all select-all border border-primary/10">
                  {webhookUrl}
                </code>
                <p className="text-[10px] text-muted-foreground">
                  Paste this URL in your GitHub Repository Settings &gt; Webhooks. Content type: <code>application/json</code>.
                </p>
              </div>
              <div className="shrink-0 flex items-center">
                <button
                  onClick={handleSimulateWebhook}
                  disabled={syncing}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Syncing...
                    </>
                  ) : (
                    <>🚀 Simulate GitHub Push</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
