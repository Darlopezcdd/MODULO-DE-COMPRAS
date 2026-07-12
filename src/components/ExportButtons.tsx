'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportButtonsProps {
  /** Datos a exportar (array de objetos) */
  data: Record<string, any>[];
  /** Nombre del archivo sin extensión */
  fileName: string;
  /** Columnas a exportar con nombre de cabecera y key del objeto */
  columns: { header: string; key: string; format?: (value: any) => string }[];
  /** URL del endpoint PDF (opcional, si existe) */
  pdfUrl?: string;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Componente reutilizable de botones de exportación Excel y PDF.
 * Utiliza la librería xlsx para generar Excel en el cliente.
 * 
 * Sprint 3 — HU12: Exportación de Información (Aldahir Requene)
 */
export default function ExportButtons({
  data,
  fileName,
  columns,
  pdfUrl,
  className = '',
}: ExportButtonsProps) {
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportExcel = async () => {
    if (data.length === 0) return;
    setExportingExcel(true);

    try {
      // Preparar datos con headers personalizados
      const worksheetData = data.map(row => {
        const mapped: Record<string, any> = {};
        columns.forEach(col => {
          const value = row[col.key];
          mapped[col.header] = col.format ? col.format(value) : value;
        });
        return mapped;
      });

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Ajustar anchos de columnas
      const colWidths = columns.map(col => ({
        wch: Math.max(
          col.header.length,
          ...data.map(row => String(row[col.key] ?? '').length)
        ) + 2,
      }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

      const fechaActual = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `${fileName}_${fechaActual}.xlsx`);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Hubo un error al generar el archivo Excel.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    if (!pdfUrl) return;
    setExportingPdf(true);

    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error('Error al generar PDF');

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      const fechaActual = new Date().toISOString().split('T')[0];
      a.download = `${fileName}_${fechaActual}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Hubo un error al generar el archivo PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const isDisabled = data.length === 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Botón Excel */}
      <button
        onClick={handleExportExcel}
        disabled={isDisabled || exportingExcel}
        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 
                   rounded-lg text-sm font-medium transition-all shadow-sm
                   hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-md
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-50 disabled:hover:shadow-sm"
        title="Exportar a Excel"
      >
        {exportingExcel ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        {exportingExcel ? 'Exportando...' : 'Excel'}
      </button>

      {/* Botón PDF (solo si hay URL de PDF) */}
      {pdfUrl && (
        <button
          onClick={handleExportPdf}
          disabled={isDisabled || exportingPdf}
          className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 
                     rounded-lg text-sm font-medium transition-all shadow-sm
                     hover:bg-red-100 hover:border-red-300 hover:shadow-md
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-50 disabled:hover:shadow-sm"
          title="Exportar a PDF"
        >
          {exportingPdf ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exportingPdf ? 'Generando...' : 'PDF'}
        </button>
      )}
    </div>
  );
}
