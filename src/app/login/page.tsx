'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  
  // Estados de navegación
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState('');

  // Estados del formulario
  const [identificador, setIdentificador] = useState(''); // Puede ser email o usuario
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Al enviar el formulario, hacemos el login centralizado ───────────────────
  const handleLoginFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: identificador, 
          password: password,
        }) 
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
      } else {
        const rol = data.usuario?.rol;
        
        if (rol === 'GESTOR_PROVEEDORES' || rol === 'COMP_GESTOR_DE_PROVEEDORES') {
          router.push('/proveedores');
        } else if (rol === 'COMPRADOR' || rol === 'COMP_COMPRADOR') {
          router.push('/facturas');
        } else if (rol === 'TESORERO' || rol === 'COMP_TESORERO') {
          router.push('/tesoreria');
        } else if (rol === 'AUDITOR') {
          router.push('/auditoria');
        } else {
          router.push('/');
        }
        
        router.refresh();
      }
    } catch {
      setError('Ocurrió un error inesperado al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render del Formulario (Vista única) ──────────────────────────────────────
  const renderLoginForm = () => (
    <form onSubmit={handleLoginFormSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      <div className="space-y-4 mt-6">
        {/* Input Correo/Usuario */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Usuario / Correo Electrónico</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail size={18} />
            </div>
            <input
              type="text"
              required
              disabled={isLoading}
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d20a11]/50 focus:border-[#d20a11] transition-all disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Ej: admin"
            />
          </div>
        </div>

        {/* Input Contraseña */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d20a11]/50 focus:border-[#d20a11] transition-all disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="••••••••"
            />
            {/* Botón Mostrar/Ocultar Contraseña */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-[#d20a11] transition-colors focus:outline-none disabled:opacity-50"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="flex justify-end mt-2">
            <Link 
              href="/recuperar-password" 
              className="text-sm font-semibold text-[#d20a11] hover:text-[#b0080d] transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>
      </div>

      {/* Botón Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center items-center gap-2 bg-[#d20a11] hover:bg-[#b0080d] text-white py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-8"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Autenticando...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <LogIn size={20} />
            Ingresar al Sistema
          </span>
        )}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden font-sans">
      {/* Destellos de fondo (Híbrido: Rojo UTN y Gris) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#d20a11]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#706f6f]/10 rounded-full blur-3xl" />
      
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl p-10 w-full max-w-md relative z-10 rounded-3xl">
        <h1 className="text-3xl font-black text-slate-800 mb-1.5 text-center tracking-tight">
          UTN <span className="text-[#d20a11]">Compras</span>
        </h1>
        <p className="text-slate-500 text-center mb-6 text-sm font-medium">
          Iniciar sesión con credenciales centralizadas
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-2 text-sm font-medium text-center animate-in fade-in">
            {error}
          </div>
        )}

        {renderLoginForm()}
      </div>
    </div>
  );
}
