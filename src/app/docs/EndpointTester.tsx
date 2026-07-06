"use client";

import { useEffect, useState } from "react";
import { useDocs } from "./DocsContext";
import { getApiUrl } from "@/lib/api";

export default function EndpointTester({ ep }: { ep: any }) {
  const { globalToken, baseUrl } = useDocs();
  const [requestBody, setRequestBody] = useState(ep.requestBody || "");
  const [requestUrl, setRequestUrl] = useState(ep.path || "");
  const [requestHeaders, setRequestHeaders] = useState(ep.requestHeaders || "{\n  \"Content-Type\": \"application/json\"\n}");

  useEffect(() => {
    setRequestBody(ep.requestBody || "");
    setRequestUrl(ep.path || "");
    setRequestHeaders(ep.requestHeaders || "{\n  \"Content-Type\": \"application/json\"\n}");
  }, [ep]);
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'example' | 'test' | 'code'>('example');
  const [lastTestedUrl, setLastTestedUrl] = useState<string>("");
  const [useMockServer, setUseMockServer] = useState(false);
  const [responseTime, setResponseTime] = useState<number>(0);

  const resolveUrl = (rawUrl: string) => {
    let target = rawUrl;
    if (baseUrl) {
      // Replace any {{variable}} at the start of the URL with baseUrl
      target = target.replace(/^\{\{[^}]+\}\}/, baseUrl);
      
      // Also replace common variables anywhere in the string just in case
      target = target.replace(/\{\{BASE_API_ENV\}\}|\{\{BASE_API\}\}|\{\{url\}\}|\{\{host\}\}/gi, baseUrl);

      // If it starts with a slash, prepend the baseUrl
      if (target.startsWith('/')) {
        target = baseUrl.replace(/\/$/, '') + target;
      }
    }
    return target;
  };

  const generateCodeSnippet = (lang: string) => {
    const targetUrl = resolveUrl(requestUrl);

    let headersStr = requestHeaders;
    if (globalToken) {
       try {
         const h = JSON.parse(requestHeaders);
         h["Token"] = globalToken;
         h["Authorization"] = `Bearer ${globalToken}`;
         headersStr = JSON.stringify(h, null, 2);
       } catch(e) {}
    }

    if (lang === 'curl') {
      let curl = `curl --location --request ${ep.method} '${targetUrl}' \\\n`;
      try {
        const h = JSON.parse(headersStr);
        Object.keys(h).forEach(k => {
          curl += `--header '${k}: ${h[k]}' \\\n`;
        });
      } catch(e) {}
      if (requestBody && ['POST','PUT','PATCH'].includes(ep.method)) {
        curl += `--data-raw '${requestBody.replace(/'/g, "'\\''")}'`;
      }
      return curl.trim().replace(/\\$/, '');
    }

    if (lang === 'js') {
      return `const headers = new Headers();\n` +
      `headers.append("Content-Type", "application/json");\n` +
      (globalToken ? `headers.append("Token", "${globalToken}");\n` : "") +
      `\nconst requestOptions = {\n` +
      `  method: '${ep.method}',\n` +
      `  headers: headers,\n` +
      (['POST','PUT','PATCH'].includes(ep.method) ? `  body: JSON.stringify(${requestBody || "{}"}),\n` : "") +
      `  redirect: 'follow'\n};\n\n` +
      `fetch("${targetUrl}", requestOptions)\n` +
      `  .then(response => response.text())\n` +
      `  .then(result => console.log(result))\n` +
      `  .catch(error => console.log('error', error));`;
    }

    if (lang === 'python') {
      let bodySnippet = "";
      if (requestBody && ['POST','PUT','PATCH'].includes(ep.method)) {
        const escapedBody = requestBody.replace(/"""/g, '\\"\\"\\"');
        bodySnippet = `data = """${escapedBody}"""\n`;
      }

      return `import requests\n\nheaders = ${headersStr}\n${bodySnippet}` +
        `response = requests.request("${ep.method}", "${targetUrl}", headers=headers${bodySnippet ? ', data=data' : ''})\n` +
        `print(response.status_code)\n` +
        `print(response.text)`;
    }
    return "";
  };

  const handleTest = async () => {
    setIsLoading(true);
    const startTime = performance.now();
    try {
      // If using mock server, call the mock endpoint directly
      if (useMockServer && ep.id) {
        const mockRes = await fetch(getApiUrl(`/mock/${ep.id}`));
        const mockData = await mockRes.json();
        const endTime = performance.now();
        setResponseTime(Math.round(endTime - startTime));
        setResponse(mockData);
        setActiveTab('test');
        return;
      }

      let parsedHeaders = { "Content-Type": "application/json" };
      try {
         parsedHeaders = JSON.parse(requestHeaders);
      } catch(e) {
         console.warn("Invalid JSON in headers", e);
      }

      // Inject Global Token
      if (globalToken) {
        (parsedHeaders as any)["Token"] = globalToken;
        (parsedHeaders as any)["Authorization"] = `Bearer ${globalToken}`;
      }

      // Handle Environment Base URL
      const targetUrl = resolveUrl(requestUrl);
      
      setLastTestedUrl(targetUrl);

      const res = await fetch(getApiUrl("/api/proxy"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl, 
          method: ep.method,
          headers: parsedHeaders,
          body: requestBody,
        }),
      });

      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));

      const data = await res.json();
      setResponse(data);
      setActiveTab('test');
    } catch (err) {
      console.error(err);
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      setResponse({ error: String(err) });
      setActiveTab('test');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full lg:max-w-[450px]">
      <div className="space-y-4">
        
        {/* Actions Header */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('example')}
              className={`text-sm font-semibold uppercase tracking-wider pb-2 border-b-2 transition-colors ${activeTab === 'example' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
            >
              Example
            </button>
            <button 
              onClick={() => setActiveTab('test')}
              className={`text-sm font-semibold uppercase tracking-wider pb-2 border-b-2 transition-colors ${activeTab === 'test' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
            >
              Results
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={`text-sm font-semibold uppercase tracking-wider pb-2 border-b-2 transition-colors ${activeTab === 'code' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
            >
              Code
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setUseMockServer(!useMockServer)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                useMockServer 
                  ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
              title={useMockServer ? "Using Mock Server" : "Using Real API"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>
              </svg>
              {useMockServer ? 'Mock Mode' : 'Real API'}
            </button>
            <button 
              onClick={handleTest}
              disabled={isLoading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              )}
              Send Request
            </button>
          </div>
        </div>

        {/* Dynamic Request Editor */}
        {activeTab === 'example' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase flex justify-between">
                <span>Request URL</span>
              </h4>
              <input 
                type="text"
                value={requestUrl}
                onChange={(e) => setRequestUrl(e.target.value)}
                className="w-full bg-card border border-border rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-primary"
                spellCheck={false}
              />
              
              {/* Query Parameters Extractor */}
              {(() => {
                try {
                  const dummyUrl = new URL(requestUrl.startsWith('http') ? requestUrl : `http://dummy.com${requestUrl.startsWith('/') ? requestUrl : '/' + requestUrl}`);
                  const params: {key: string, value: string}[] = [];
                  dummyUrl.searchParams.forEach((value, key) => {
                    params.push({ key, value });
                  });
                  
                  if (params.length === 0) return null;

                  return (
                    <div className="pt-2">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Query Parameters</h4>
                      <div className="space-y-2">
                        {params.map((p, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <div className="w-1/3 bg-muted px-2 py-1.5 rounded-md text-xs font-mono text-muted-foreground truncate border border-border" title={p.key}>
                              {p.key}
                            </div>
                            <span className="text-muted-foreground text-xs">=</span>
                            <input
                              type="text"
                              value={p.value}
                              onChange={(e) => {
                                const newUrl = new URL(requestUrl.startsWith('http') ? requestUrl : `http://dummy.com${requestUrl.startsWith('/') ? requestUrl : '/' + requestUrl}`);
                                newUrl.searchParams.set(p.key, e.target.value);
                                setRequestUrl(requestUrl.startsWith('http') ? newUrl.href : newUrl.pathname + newUrl.search);
                              }}
                              className="flex-1 bg-card border border-border rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary transition-colors text-foreground"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } catch(e) { return null; }
              })()}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Headers (JSON)</h4>
              <textarea 
                value={requestHeaders}
                onChange={(e) => setRequestHeaders(e.target.value)}
                className="w-full h-16 bg-card border border-border rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-muted-foreground"
                spellCheck={false}
              />
            </div>

            {(ep.requestBody || ['POST', 'PUT', 'PATCH'].includes(ep.method.toUpperCase())) && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Request Body</h4>
                <textarea 
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full h-32 bg-card border border-border rounded-lg p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">cURL</h4>
                <button onClick={() => navigator.clipboard.writeText(generateCodeSnippet('curl'))} className="text-xs text-primary hover:underline">Copy</button>
              </div>
              <pre className="p-3 bg-[#1e1e2e] border border-[#313244] rounded-lg text-xs font-mono text-[#cdd6f4] overflow-x-auto whitespace-pre-wrap">
                {generateCodeSnippet('curl')}
              </pre>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">JavaScript Fetch</h4>
                <button onClick={() => navigator.clipboard.writeText(generateCodeSnippet('js'))} className="text-xs text-primary hover:underline">Copy</button>
              </div>
              <pre className="p-3 bg-[#1e1e2e] border border-[#313244] rounded-lg text-xs font-mono text-[#cdd6f4] overflow-x-auto whitespace-pre-wrap">
                {generateCodeSnippet('js')}
              </pre>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Python Requests</h4>
                <button onClick={() => navigator.clipboard.writeText(generateCodeSnippet('python'))} className="text-xs text-primary hover:underline">Copy</button>
              </div>
              <pre className="p-3 bg-[#1e1e2e] border border-[#313244] rounded-lg text-xs font-mono text-[#cdd6f4] overflow-x-auto whitespace-pre-wrap">
                {generateCodeSnippet('python')}
              </pre>
            </div>
          </div>
        )}

        {/* View Area for Results */}
        {(activeTab === 'test' || activeTab === 'example') && (
          <div className="bg-[#1e1e2e] border border-[#313244] rounded-xl overflow-hidden shadow-xl mt-4">
            <div className="bg-[#181825] px-4 py-2.5 border-b border-[#313244]">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${activeTab === 'test' && response ? (response.status >= 200 && response.status < 300 ? 'bg-green-500' : response.status >= 400 && response.status < 500 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-gray-500'}`}></span>
                  <span className="text-xs font-mono text-[#a6adc8] font-semibold">
                    {activeTab === 'test' && response ? (
                      <span>
                        <span className={
                          response.status >= 200 && response.status < 300 ? 'text-green-400' :
                          response.status >= 300 && response.status < 400 ? 'text-blue-400' :
                          response.status >= 400 && response.status < 500 ? 'text-yellow-400' :
                          'text-red-400'
                        }>
                          {response.status}
                        </span>
                        {' '}{response.statusText || 'OK'}
                      </span>
                    ) : (ep.responseStatus || '200')}
                  </span>
                </div>
                
                {activeTab === 'test' && (
                  <div className="flex items-center gap-4">
                    {responseTime > 0 && (
                      <span className="text-[11px] text-[#a6adc8] font-mono">
                        ⏱️ {responseTime}ms
                      </span>
                    )}
                    {lastTestedUrl && (
                      <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px] lg:max-w-[300px]" title={lastTestedUrl}>
                        🔗 {lastTestedUrl}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-[#cdd6f4] overflow-x-auto whitespace-pre-wrap max-h-[400px]">
              <code>
                {activeTab === 'test' 
                  ? (response ? JSON.stringify(response.data || response, null, 2) : "Click 'Send Request' to test...") 
                  : (ep.responseBody || "No example available")}
              </code>
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}
