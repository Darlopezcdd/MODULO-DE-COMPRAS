'use client';

import React, { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetch('/api/swagger')
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => console.error('Error cargando Swagger spec:', err));
  }, []);

  if (!spec) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0f172a',
        color: '#94a3b8',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '1.1rem',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #334155',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          Cargando documentación de la API...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      <style>{`
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { color: #0f172a; font-family: 'Inter', system-ui, sans-serif; }
        .swagger-ui .info p, .swagger-ui .info li { color: #475569; font-family: 'Inter', system-ui, sans-serif; }
        .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #22c55e; }
        .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #3b82f6; }
        .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #ef4444; }
        .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #f59e0b; }
        .swagger-ui .btn.execute { background: #3b82f6; border-color: #3b82f6; }
        .swagger-ui .btn.execute:hover { background: #2563eb; }
        .swagger-ui section.models { border-radius: 8px; }
        .swagger-ui .model-box { background: #f8fafc; }
      `}</style>
      <SwaggerUI spec={spec} />
    </div>
  );
}
