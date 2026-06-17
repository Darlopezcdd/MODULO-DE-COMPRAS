'use client';

import { useState } from 'react';

interface FacturaPdfPreviewProps {
  data: any; // El json de la factura, proveniente de react-hook-form
}

export function FacturaPdfPreview({ data }: FacturaPdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handlePreview = async () => {
    // Bloquear UI evitando múltiples clics
    if (isLoading) return;
    
    setIsOpen(true);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/pdf/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al generar la previsualización');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl(objectUrl);
    } catch (error) {
      console.error(error);
      alert('Hubo un error generando el PDF');
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const closePreview = () => {
    setIsOpen(false);
    // Pequeño timeout para permitir la animación de cierre antes de limpiar el blob
    setTimeout(() => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }, 300);
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePreview}
        disabled={isLoading}
        className={`relative flex items-center justify-center gap-2 font-medium py-2 px-6 rounded-lg transition-all duration-300 shadow-sm
          ${isLoading 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 text-white'
          } w-full`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generando...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M10 18l4-4-4-4" />
            </svg>
            Previsualizar PDF
          </>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header del Modal */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Vista Previa de Factura</h3>
                  <p className="text-xs text-slate-500">Documento generado en el servidor</p>
                </div>
              </div>
              <button 
                onClick={closePreview}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            {/* Contenido del Modal */}
            <div className="flex-1 bg-slate-100/50 relative overflow-hidden">
              {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-20">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-100 border-solid rounded-full animate-pulse"></div>
                    <div className="w-16 h-16 border-4 border-blue-600 border-solid rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                  </div>
                  <h4 className="mt-6 text-lg font-semibold text-slate-700">Construyendo Documento</h4>
                  <p className="text-sm text-slate-500 mt-1">Renderizando plantilla HTML a PDF...</p>
                </div>
              ) : pdfUrl ? (
                <div className="w-full h-full p-2 sm:p-6 bg-slate-200/50">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full border border-slate-200 shadow-lg rounded-xl bg-white"
                    title="Previsualización PDF"
                  />
                </div>
              ) : (
                <div className="flex flex-col h-full items-center justify-center text-rose-500 gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <p className="font-medium text-lg">No se pudo cargar el PDF.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
