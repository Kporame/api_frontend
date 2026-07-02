"use client";

import { useState } from "react";
import { useDocs, DEFAULT_BASE_URLS } from "./DocsContext";

export default function DocsToolbar() {
  const {
    globalToken,
    setGlobalToken,
    baseUrl,
    setBaseUrl,
    environment,
    setEnvironment,
    environmentPresets,
    customPresets,
    addEnvironmentPreset,
    removeEnvironmentPreset
  } = useDocs();

  const [isEditing, setIsEditing] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetUrl, setNewPresetUrl] = useState("");
  const [presetError, setPresetError] = useState<string | null>(null);

  const normalizeUrl = (url: string) => {
    try {
      return new URL(url).toString().replace(/\/$/, "");
    } catch {
      return url.trim();
    }
  };

  const defaultPresetEntries = Object.entries(environmentPresets).filter(
    ([name]) => name !== "Custom" && DEFAULT_BASE_URLS[name]
  );
  const customPresetEntries = customPresets.map((preset) => [preset.id, preset.url, preset.name] as const);
  const presetNameSuggestions = Object.keys(DEFAULT_BASE_URLS).filter((name) => name !== "Custom");

  const selectedPresetName =
    defaultPresetEntries.find(([name]) => name === environment)?.[0] ||
    customPresets.find((preset) => preset.id === environment)?.name ||
    (environment === "Custom" ? "Custom" : environment);

  const handleEnvironmentChange = (env: string) => {
    setEnvironment(env);
    if (env !== "Custom" && environmentPresets[env]) {
      setBaseUrl(environmentPresets[env]);
    }
  };

  const presetEntries = [...defaultPresetEntries, ...customPresetEntries.map(([id, url]) => [id, url] as const)];

  const handleBaseUrlChange = (url: string) => {
    const normalizedUrl = normalizeUrl(url);
    setBaseUrl(normalizedUrl);
    const match = presetEntries.find(([, value]) => value === normalizedUrl);
    setEnvironment(match ? match[0] : "Custom");
  };

  const handleAddPreset = () => {
    const name = newPresetName.trim();
    const url = newPresetUrl.trim();
    if (!name || !url) {
      setPresetError("กรุณาระบุชื่อและ URL");
      return;
    }
    if (name === "Custom") {
      setPresetError("กรุณาใช้ชื่อ preset ที่ไม่ซ้ำ");
      return;
    }
    try {
      const normalized = normalizeUrl(url);
      if (!normalized) {
        setPresetError("Invalid URL.");
        return;
      }
      const id = addEnvironmentPreset(name, normalized);
      setNewPresetName("");
      setNewPresetUrl("");
      setPresetError(null);
      if (id) {
        setEnvironment(id);
      }
      setBaseUrl(normalized);
    } catch {
      setPresetError("Invalid URL.");
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-8 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">GitHub Webhook Sync & Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">ตั้งค่า webhook จาก repository เพื่อซิงก์สเปก API โดยอัตโนมัติเมื่อ merge commit</p>
        </div>
        <button
          onClick={() => setIsEditing((prev) => !prev)}
          className="inline-flex items-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Edit Settings
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr]">
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Environment Preset</label>
          <div className="relative">
            <select
              value={environment}
              onChange={(e) => handleEnvironmentChange(e.target.value)}
              className="mt-2 w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors appearance-none"
            >
              {defaultPresetEntries.map(([name]) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {customPresetEntries.length > 0 && (
                <optgroup label="Saved presets">
                  {customPresetEntries.map(([id, url, name]) => (
                    <option key={id} value={id}>
                      {name} — {url}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="Custom">Custom</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8l4 4 4-4" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {environment !== "Custom"
              ? `Selected preset: ${selectedPresetName} — ${environmentPresets[environment]}`
              : "เลือก URL แบบกำหนดเองแล้ว ระบุ URL ด้านล่าง"}
          </p>
        </div>

        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Custom Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => handleBaseUrlChange(e.target.value)}
            placeholder="e.g. http://localhost:3333 or https://api.example.com"
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">เขียนทับ preset ใดก็ได้ การเปลี่ยนแปลงจะถูกบันทึกอัตโนมัติ</p>
        </div>

        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Global Auth Token
          </label>
          <input
            type="password"
            value={globalToken}
            onChange={(e) => setGlobalToken(e.target.value)}
            placeholder="Paste your Bearer token here..."
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors font-mono"
          />
          <p className="text-xs text-muted-foreground">Auto-inserted in all requests. Saved locally.</p>
        </div>
      </div>

      {isEditing && (
        <div className="mt-5 rounded-2xl border border-border bg-background/70 p-4 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">New preset</p>
            <p className="text-xs text-muted-foreground">เพิ่ม preset ที่มีชื่อเพื่อแสดงในรายการ</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
            <div className="relative">
              <select
                value={newPresetName}
                onChange={(e) => {
                  setNewPresetName(e.target.value);
                  setPresetError(null);
                }}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="" disabled hidden>
                  ชื่อ preset
                </option>
                {presetNameSuggestions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8l4 4 4-4" />
                </svg>
              </div>
            </div>
            <input
              type="text"
              value={newPresetUrl}
              onChange={(e) => {
                setNewPresetUrl(e.target.value);
                setPresetError(null);
              }}
              placeholder="URL ของ preset"
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors font-mono"
            />
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <button
              onClick={handleAddPreset}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              เพิ่ม preset
            </button>
            {presetError && <p className="text-xs text-red-500">{presetError}</p>}
          </div>

          {customPresetEntries.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Saved presets</p>
                <span className="text-xs text-muted-foreground">Delete one to remove it</span>
              </div>
              <div className="space-y-2">
                {customPresetEntries.map(([id, url, name]) => (
                  <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">{url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEnvironmentPreset(id)}
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-destructive px-3 py-2 text-xs font-medium text-white hover:bg-destructive/90 transition-colors"
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
