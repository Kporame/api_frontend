"use client";

import { useState } from "react";

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  example?: string;
}

interface SchemaDisplay {
  title: string;
  items: Parameter[];
}

export default function EndpointSchemaViewer({ 
  endpoint, 
  schema
}: { 
  endpoint?: any;
  schema?: any;
}) {
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'response'>('params');

  // Parse parameters from endpoint
  const parseParameters = (params: any) => {
    if (!params) return [];
    if (typeof params === 'string') {
      try {
        const parsed = JSON.parse(params);
        // Convert object to array of key-value pairs
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return Object.entries(parsed).map(([key, value]: any) => ({
            name: key,
            type: typeof value,
            required: false,
            description: '',
            example: value
          }));
        }
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (typeof params === 'object' && !Array.isArray(params)) {
      return Object.entries(params).map(([key, value]: any) => ({
        name: key,
        type: typeof value,
        required: false,
        description: '',
        example: value
      }));
    }
    return Array.isArray(params) ? params : [];
  };

  const parameters = parseParameters(endpoint?.parameters || schema?.parameters);
  const headers = parseParameters(endpoint?.requestHeaders || schema?.requestHeaders);
  const responseSchema = schema ? JSON.parse(JSON.stringify(schema)) : endpoint?.responseSchema ? JSON.parse(JSON.stringify(endpoint.responseSchema)) : null;

  const ParameterTable = ({ data }: { data: any[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-2 font-semibold text-foreground">Name</th>
            <th className="text-left px-4 py-2 font-semibold text-foreground">Type</th>
            <th className="text-left px-4 py-2 font-semibold text-foreground">Required</th>
            <th className="text-left px-4 py-2 font-semibold text-foreground">Description</th>
            <th className="text-left px-4 py-2 font-semibold text-foreground">Example</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-2 font-mono text-sm text-foreground">{item.name}</td>
              <td className="px-4 py-2">
                <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-[11px] font-semibold">
                  {item.type}
                </span>
              </td>
              <td className="px-4 py-2">
                {item.required ? (
                  <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-[11px] font-semibold">
                    Required
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-500/10 text-gray-500 rounded text-[11px] font-semibold">
                    Optional
                  </span>
                )}
              </td>
              <td className="px-4 py-2 text-muted-foreground">{item.description || '-'}</td>
              <td className="px-4 py-2 font-mono text-[11px] text-foreground/70 break-all">{item.example || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No parameters</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('params')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'params'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Parameters
          {activeTab === 'params' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('headers')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'headers'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Headers
          {activeTab === 'headers' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('response')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'response'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Response
          {activeTab === 'response' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-lg p-4">
        {activeTab === 'params' && <ParameterTable data={parameters} />}
        
        {activeTab === 'headers' && <ParameterTable data={headers} />}
        
        {activeTab === 'response' && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              <strong>Status Code:</strong> {endpoint.statusCode || 200}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              <strong>Content-Type:</strong> application/json
            </p>
            <details className="cursor-pointer">
              <summary className="font-semibold text-foreground mb-4 hover:text-primary transition-colors">
                📋 Response Schema
              </summary>
              <div className="mt-4 bg-background rounded p-4 font-mono text-[11px] overflow-x-auto">
                <pre>
                  {JSON.stringify(responseSchema || endpoint.exampleResponse || {}, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
