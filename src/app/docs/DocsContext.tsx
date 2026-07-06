"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type EnvironmentOption = string;
export type DocsPresetMap = Record<string, string>;
export type DocsPreset = {
  id: string;
  name: string;
  url: string;
};

export const DEFAULT_BASE_URLS: DocsPresetMap = {
  Local: "http://localhost:4010",
  Staging: "https://staging.example.com",
  Production: "https://api.example.com",
  Custom: ""
};

type DocsContextType = {
  globalToken: string;
  setGlobalToken: (token: string) => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  environment: EnvironmentOption;
  setEnvironment: (environment: EnvironmentOption) => void;
  environmentPresets: DocsPresetMap;
  customPresets: DocsPreset[];
  addEnvironmentPreset: (name: string, url: string) => string;
  removeEnvironmentPreset: (id: string) => void;
};

const DocsContext = createContext<DocsContextType | undefined>(undefined);

export function DocsProvider({ children }: { children: React.ReactNode }) {
  const [globalToken, setGlobalToken] = useState("");
  const [environment, setEnvironment] = useState<EnvironmentOption>("Local");
  const [baseUrl, setBaseUrl] = useState<string>(DEFAULT_BASE_URLS.Local);
  const [customPresets, setCustomPresets] = useState<DocsPreset[]>([]);

  const environmentPresets = {
    ...DEFAULT_BASE_URLS,
    ...Object.fromEntries(customPresets.map((preset) => [preset.id, preset.url]))
  };

  const normalizeUrl = (url: string) => {
    try {
      return new URL(url).toString().replace(/\/$/, "");
    } catch {
      return url.trim();
    }
  };

  const getEnvironmentFromUrl = (url: string, presets: DocsPresetMap): EnvironmentOption => {
    const normalized = normalizeUrl(url);
    const entry = Object.entries(presets).find(([, value]) => value === normalized);
    return entry ? entry[0] : "Custom";
  };

  const loadSavedPresets = (): DocsPreset[] => {
    if (typeof window === "undefined") return [];
    const saved = window.localStorage.getItem("apiPortalEnvironmentPresets");
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is DocsPreset =>
            item && typeof item === "object" &&
            typeof (item as any).id === "string" &&
            typeof (item as any).name === "string" &&
            typeof (item as any).url === "string"
        );
      }
      if (parsed && typeof parsed === "object") {
        return Object.entries(parsed).map(([name, url]) => ({
          id: name,
          name,
          url: normalizeUrl(String(url))
        }));
      }
      return [];
    } catch {
      return [];
    }
  };

  const addEnvironmentPreset = (name: string, url: string) => {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName === "Custom") return "";
    const id = `${normalizedName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const normalizedUrl = normalizeUrl(url);
    setCustomPresets((prev) => [
      ...prev,
      { id, name: normalizedName, url: normalizedUrl }
    ]);
    return id;
  };

  const removeEnvironmentPreset = (id: string) => {
    const normalizedId = id.trim();
    if (!normalizedId) return;
    setCustomPresets((prev) => prev.filter((preset) => preset.id !== normalizedId));
    if (environment === normalizedId) {
      setEnvironment("Custom");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedPresets = loadSavedPresets();
    const savedEnv = window.localStorage.getItem("apiPortalEnvironment") as EnvironmentOption | null;
    const savedBaseUrl = window.localStorage.getItem("apiPortalBaseUrl");

    setCustomPresets(savedPresets);
    const allPresets = {
      ...DEFAULT_BASE_URLS,
      ...Object.fromEntries(savedPresets.map((preset) => [preset.id, preset.url]))
    };

    if (savedBaseUrl) {
      const normalizedBaseUrl = normalizeUrl(savedBaseUrl);
      const inferredEnv = getEnvironmentFromUrl(normalizedBaseUrl, allPresets);
      setEnvironment(inferredEnv);
      setBaseUrl(normalizedBaseUrl);
    } else if (savedEnv && Object.keys(allPresets).includes(savedEnv)) {
      setEnvironment(savedEnv);
      setBaseUrl(allPresets[savedEnv]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("apiPortalEnvironmentPresets", JSON.stringify(customPresets));
  }, [customPresets]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("apiPortalEnvironment", environment);
    if (environment !== "Custom" && environmentPresets[environment]) {
      setBaseUrl(environmentPresets[environment]);
    }
  }, [environment, environmentPresets]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const normalized = normalizeUrl(baseUrl);
    if (normalized !== baseUrl) {
      setBaseUrl(normalized);
      return;
    }

    window.localStorage.setItem("apiPortalBaseUrl", normalized);
    setEnvironment(getEnvironmentFromUrl(normalized, environmentPresets));
  }, [baseUrl, environmentPresets]);

  return (
    <DocsContext.Provider
      value={{
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
      }}
    >
      {children}
    </DocsContext.Provider>
  );
}

export function useDocs() {
  const context = useContext(DocsContext);
  if (!context) throw new Error("useDocs must be used within DocsProvider");
  return context;
}
