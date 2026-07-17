'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

interface AlertMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export default function GlobalAlert() {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);

  useEffect(() => {
    // Sobrescribir el window.alert nativo
    const originalAlert = window.alert;
    window.alert = (message: any) => {
      const newAlert: AlertMessage = {
        id: Math.random().toString(36).substring(2, 9),
        message: String(message),
        type: 'warning' // Default to warning for generic alerts
      };
      
      setAlerts(prev => [...prev, newAlert]);
      
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== newAlert.id));
      }, 5000);
    };

    // Escuchar eventos personalizados por si queremos invocar con otros tipos (success, error)
    const handleAlert = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newAlert = {
        id: Math.random().toString(36).substring(2, 9),
        ...customEvent.detail
      };
      
      setAlerts(prev => [...prev, newAlert]);
      
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== newAlert.id));
      }, 5000);
    };

    window.addEventListener('app-custom-alert', handleAlert);

    return () => {
      window.alert = originalAlert; // Restaurar si se desmonta
      window.removeEventListener('app-custom-alert', handleAlert);
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none">
      {alerts.map(alert => {
        let Icon = AlertTriangle;
        let bgClass = "bg-white border-yellow-200 text-slate-800";
        let iconClass = "text-yellow-500 bg-yellow-100";
        let progressBarClass = "bg-yellow-400";
        
        if (alert.type === 'error') {
          Icon = XCircle;
          bgClass = "bg-white border-red-200 text-slate-800";
          iconClass = "text-red-500 bg-red-100";
          progressBarClass = "bg-red-500";
        } else if (alert.type === 'success') {
          Icon = CheckCircle;
          bgClass = "bg-white border-emerald-200 text-slate-800";
          iconClass = "text-emerald-500 bg-emerald-100";
          progressBarClass = "bg-emerald-500";
        } else if (alert.type === 'info') {
          Icon = Info;
          bgClass = "bg-white border-blue-200 text-slate-800";
          iconClass = "text-blue-500 bg-blue-100";
          progressBarClass = "bg-blue-500";
        }

        return (
          <div 
            key={alert.id} 
            className={`pointer-events-auto relative overflow-hidden flex items-start gap-4 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border ${bgClass} w-[360px] max-w-[calc(100vw-3rem)] transform transition-all duration-300`}
            style={{
              animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <div className={`p-2 rounded-full shrink-0 ${iconClass}`}>
              <Icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            
            <div className="flex-1 pt-1">
              <h4 className="text-sm font-bold mb-1 text-slate-900">
                {alert.type === 'error' ? 'Error' : alert.type === 'success' ? 'Éxito' : alert.type === 'info' ? 'Información' : 'Atención'}
              </h4>
              <p className="text-sm font-medium text-slate-600 whitespace-pre-line leading-snug">
                {alert.message}
              </p>
            </div>
            
            <button 
              onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
              className="opacity-40 hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded-md shrink-0 mt-0.5"
            >
              <X className="w-4 h-4 text-slate-700" strokeWidth={2.5} />
            </button>
            
            {/* Barra de progreso simplificada con transición CSS pura en lugar de animación Tailwind custom */}
            <div 
              className={`absolute bottom-0 left-0 h-1 ${progressBarClass}`}
              style={{
                width: '100%',
                animation: 'toast-progress 5s linear forwards'
              }}
            />
            
            <style>{`
              @keyframes toast-slide-in {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
              @keyframes toast-progress {
                from { width: 100%; }
                to { width: 0%; }
              }
            `}</style>
          </div>
        );
      })}
    </div>
  );
}
