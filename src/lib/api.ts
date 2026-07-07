export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    // Prefer explicit NEXT_PUBLIC_API_BASE_URL when provided at build/runtime
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (configured && configured.trim() !== '') return configured.replace(/\/$/, '');

    // In the browser fallback behaviour
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4010';
    }

    // Fallback to current origin if no configured API base URL
    return window.location.origin.replace(/\/$/, '');
  }
  
  // On the server (Next.js SSR)
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  return (configuredUrl || "http://api:4010").replace(/\/$/, "");
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
