const fallbackApiBaseUrl = "http://localhost:4010";

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  return (configuredUrl || fallbackApiBaseUrl).replace(/\/$/, "");
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
