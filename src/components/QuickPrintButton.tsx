'use client';

import React, { useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';

interface QuickPrintButtonProps {
  /** URL del PDF a imprimir */
  pdfUrl: string;
  /** Clases de Tailwind adicionales para el botón */
  className?: string;
  /** Tamaño del icono */
  size?: number;
}

/**
 * Componente QuickPrintButton para impresión ágil de documentos en PDF.
 * Crea un iframe temporal oculto para cargar el archivo y dispara el cuadro de diálogo de impresión.
 * HU16 - Botón de Impresión Rápida (Aldahir Requene)
 */
export default function QuickPrintButton({
  pdfUrl,
  className = '',
  size = 16,
}: QuickPrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se active el click de la fila/contenedor
    if (isPrinting) return;

    setIsPrinting(true);

    try {
      // 1. Remover iframe previo si existiera
      const oldIframe = document.getElementById('quick-print-iframe');
      if (oldIframe) {
        oldIframe.remove();
      }

      // 2. Crear un iframe invisible
      const iframe = document.createElement('iframe');
      iframe.id = 'quick-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      
      // 3. Agregar al body
      document.body.appendChild(iframe);

      // 4. Esperar a que cargue el PDF e imprimir
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            console.error('Error al intentar invocar la impresión nativa del iframe:', err);
            // Fallback: abrir en nueva pestaña
            window.open(pdfUrl, '_blank');
          } finally {
            setIsPrinting(false);
          }
        }, 300);
      };

      iframe.src = pdfUrl;
    } catch (error) {
      console.error('Error en el proceso de impresión rápida:', error);
      setIsPrinting(false);
      // Fallback
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={isPrinting}
      className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all border border-slate-200 bg-white hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Impresión rápida"
      aria-label="Imprimir documento rápidamente"
      type="button"
    >
      {isPrinting ? (
        <Loader2 className="animate-spin text-purple-600" style={{ width: size, height: size }} />
      ) : (
        <Printer className="text-slate-600" style={{ width: size, height: size }} />
      )}
    </button>
  );
}
