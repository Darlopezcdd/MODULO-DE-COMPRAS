'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type AlertType = 'success' | 'info' | 'warning' | 'error';

interface AlertBannerProps {
  type: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
  autoCloseMs?: number;
  className?: string;
}

const typeConfigs = {
  success: {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    progressBar: 'bg-emerald-500',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
    progressBar: 'bg-blue-500',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    progressBar: 'bg-amber-500',
  },
  error: {
    bg: 'bg-rose-50 border-rose-200 text-rose-800',
    icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    progressBar: 'bg-rose-500',
  },
};

/**
 * Componente AlertBanner para mejoras de usabilidad y visibilidad de alertas.
 * HU15 - Mejora de Interfaz de Alertas (Aldahir Requene)
 */
export default function AlertBanner({
  type,
  title,
  message,
  onClose,
  autoCloseMs,
  className = '',
}: AlertBannerProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const config = typeConfigs[type];

  useEffect(() => {
    if (!autoCloseMs) return;

    const intervalTime = 100;
    const steps = autoCloseMs / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const nextProgress = 100 - (currentStep / steps) * 100;
      setProgress(Math.max(0, nextProgress));

      if (currentStep >= steps) {
        clearInterval(timer);
        setVisible(false);
        if (onClose) onClose();
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [autoCloseMs, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`relative flex items-start gap-3 p-4 rounded-xl border shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${config.bg} ${className}`}
      role="alert"
    >
      {/* Icono de la alerta */}
      {config.icon}

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-bold text-sm tracking-tight mb-1">{title}</h4>}
        <p className="text-sm leading-relaxed">{message}</p>
      </div>

      {/* Botón de cerrar */}
      {onClose && (
        <button
          onClick={() => {
            setVisible(false);
            onClose();
          }}
          className="p-1 rounded-lg text-current opacity-60 hover:opacity-100 hover:bg-black/5 transition-all focus:outline-none"
          aria-label="Cerrar alerta"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Barra de progreso para autoClose */}
      {autoCloseMs && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 rounded-b-xl overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ease-linear ${config.progressBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
