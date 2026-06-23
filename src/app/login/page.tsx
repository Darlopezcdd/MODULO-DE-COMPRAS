'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleMockLogin = async (rol: 'ADMIN' | 'COMPRADOR') => {
    setIsLoading(rol);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol }) // Enviamos el rol simulado
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Ocurrió un error inesperado al simular el login');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-100 rounded-full blur-3xl" />
      
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl p-10 w-full max-w-lg relative z-10 rounded-2xl">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">
          Módulo de <span className="text-blue-600">Compras</span>
        </h1>
        <p className="text-slate-500 text-center mb-8">
          Modo Desarrollo: Selecciona un rol para probar (Login Simulado)
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={() => handleMockLogin('ADMIN')}
            disabled={isLoading !== null}
            className="w-full flex items-center justify-between bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-500 p-4 rounded-xl transition-all group disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-lg">Entrar como ADMIN</p>
                <p className="text-sm text-slate-500">Acceso total a facturas, proveedores y reportes.</p>
              </div>
            </div>
            {isLoading === 'ADMIN' && <span className="text-blue-600 font-medium">Cargando...</span>}
          </button>

          <button
            onClick={() => handleMockLogin('COMPRADOR')}
            disabled={isLoading !== null}
            className="w-full flex items-center justify-between bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-teal-500 p-4 rounded-xl transition-all group disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="bg-teal-100 text-teal-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                <UserCircle2 size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-lg">Entrar como COMPRADOR</p>
                <p className="text-sm text-slate-500">Acceso solo a facturas y proveedores.</p>
              </div>
            </div>
            {isLoading === 'COMPRADOR' && <span className="text-teal-600 font-medium">Cargando...</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
