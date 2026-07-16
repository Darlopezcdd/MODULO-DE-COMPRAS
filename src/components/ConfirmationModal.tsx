'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'success' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'info',
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      accentColor: '#d20a11', // Rojo UTN
      bgAccent: 'rgba(210, 10, 17, 0.1)',
      btnBg: 'bg-[#d20a11] hover:bg-[#d20a11]/90 focus:ring-red-200',
    },
    success: {
      accentColor: '#10b981', // Verde
      bgAccent: 'rgba(16, 185, 129, 0.1)',
      btnBg: 'bg-[#10b981] hover:bg-[#10b981]/90 focus:ring-emerald-200',
    },
    info: {
      accentColor: '#3b82f6', // Azul
      bgAccent: 'rgba(59, 130, 246, 0.1)',
      btnBg: 'bg-[#3b82f6] hover:bg-[#3b82f6]/90 focus:ring-blue-200',
    },
  };

  const current = typeConfig[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera / Botón cerrar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button 
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 flex gap-4">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: current.bgAccent }}
          >
            <AlertTriangle className="w-6 h-6" style={{ color: current.accentColor }} />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-100"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 ${current.btnBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
