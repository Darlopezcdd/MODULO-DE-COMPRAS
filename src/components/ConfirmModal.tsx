import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  type = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const config = {
    danger: {
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      bg: "bg-red-100",
      btn: "bg-red-600 hover:bg-red-700 focus:ring-red-500"
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
      bg: "bg-yellow-100",
      btn: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-600" />,
      bg: "bg-blue-100",
      btn: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${config[type].bg}`}>
              {config[type].icon}
            </div>
            <div className="flex-1 mt-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <div className="text-sm text-slate-600 whitespace-pre-wrap">{message}</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-slate-100">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 transition shadow-sm"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition shadow-sm ${config[type].btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
