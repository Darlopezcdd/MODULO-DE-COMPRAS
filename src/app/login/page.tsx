'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserCircle2, Mail, Lock, ArrowLeft, LogIn, Eye, EyeOff } from 'lucide-react';

type Role = 'ADMIN' | 'COMPRADOR' | 'GESTOR_PROVEEDORES' | 'TESORERO' | 'AUDITOR';

export default function LoginPage() {
  const router = useRouter();
  
  // Estados de navegación
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState('');

  // Estados del formulario
  const [identificador, setIdentificador] = useState(''); // Puede ser email o usuario
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── 1. Al seleccionar un rol, preparamos el formulario ──────────────────────
  const handleSelectRole = (rol: Role) => {
    setSelectedRole(rol);
    setError('');
    setShowPassword(false); // Resetear visibilidad al cambiar rol
    
    // Autocompletamos con un nombre de usuario genérico basado en el rol
    setIdentificador(rol.toLowerCase());
    setPassword(''); // No prellenar contraseña, el usuario debe escribirla
  };

  // ── 2. Al enviar el formulario, hacemos el login simulado ───────────────────
  const handleLoginFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setIsLoading(true);
    setError('');

    try {
      // Simulamos un pequeño retraso para que parezca un login real
      await new Promise(resolve => setTimeout(resolve, 800));

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: identificador, 
          password: password,
          rol: selectedRole // Mantenido temporalmente como fallback
        }) 
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
      setIsLoading(false);
    }
  };

  // ── 3. Render de las opciones de Rol (Vista 1) ──────────────────────────────
  const renderRoleSelection = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
      <button
        onClick={() => handleSelectRole('ADMIN')}
        className="w-full flex items-center justify-between bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-[#d20a11] p-4 rounded-xl transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-[#d20a11]/10 text-[#d20a11] p-3 rounded-lg group-hover:scale-110 transition-transform">
            <ShieldCheck size={24} />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800 text-lg">Entrar como ADMIN</p>
            <p className="text-sm text-slate-500">Acceso total a facturas, proveedores y reportes.</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => handleSelectRole('COMPRADOR')}
        className="w-full flex items-center justify-between bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-[#d20a11] p-4 rounded-xl transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-[#d20a11]/10 text-[#d20a11] p-3 rounded-lg group-hover:scale-110 transition-transform">
            <UserCircle2 size={24} />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800 text-lg">Entrar como COMPRADOR</p>
            <p className="text-sm text-slate-500">Acceso solo a facturas y proveedores.</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => handleSelectRole('GESTOR_PROVEEDORES')}
        className="w-full flex items-center justify-between bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-[#d20a11] p-4 rounded-xl transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-[#d20a11]/10 text-[#d20a11] p-3 rounded-lg group-hover:scale-110 transition-transform">
            <ShieldCheck size={24} />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800 text-lg">Entrar como GESTOR PROVEEDORES</p>
            <p className="text-sm text-slate-500">Exclusivo al módulo de Proveedores y Catálogos.</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => handleSelectRole('AUDITOR')}
        className="w-full flex items-center justify-between bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-[#003366] p-4 rounded-xl transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-[#d10a11]/10 text-[#d10a11] p-3 rounded-lg group-hover:scale-110 transition-transform">
            <ShieldCheck size={24} />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800 text-lg">Entrar como AUDITOR</p>
            <p className="text-sm text-slate-500">Consultar pistas de auditoría del sistema.</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => handleSelectRole('TESORERO')}
        className="w-full flex items-center justify-between bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-[#d20a11] p-4 rounded-xl transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-[#d20a11]/10 text-[#d20a11] p-3 rounded-lg group-hover:scale-110 transition-transform">
            <UserCircle2 size={24} />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800 text-lg">Entrar como TESORERO</p>
            <p className="text-sm text-slate-500">Gestión de pagos, cuentas por pagar y reportes.</p>
          </div>
        </div>
      </button>
    </div>
  );

  // ── 4. Render del Formulario (Vista 2) ──────────────────────────────────────
  const renderLoginForm = () => (
    <form onSubmit={handleLoginFormSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* Botón regresar */}
      <button 
        type="button"
        onClick={() => setSelectedRole(null)}
        disabled={isLoading}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#d20a11] font-semibold transition-colors disabled:opacity-50"
      >
        <ArrowLeft size={16} /> Volver a los roles
      </button>

      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Rol Simulado</p>
        <p className="text-lg font-bold text-[#d20a11]">{selectedRole?.replace('_', ' ')}</p>
      </div>

      <div className="space-y-4">
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
              placeholder="Ej: admin@utn.edu.ec"
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
        </div>
      </div>

      {/* Botón Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center items-center gap-2 bg-[#d20a11] hover:bg-[#b0080d] text-white py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Verificando...
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
      
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl p-10 w-full max-w-lg relative z-10 rounded-3xl">
        <h1 className="text-3xl font-black text-slate-800 mb-1.5 text-center tracking-tight">
          UTN <span className="text-[#d20a11]">Compras</span>
        </h1>
        <p className="text-slate-500 text-center mb-8 text-sm font-medium">
          Módulo de Seguridad — Iniciar Sesión
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* Mostrar condicionalmente los roles o el formulario */}
        {!selectedRole ? renderRoleSelection() : renderLoginForm()}

      </div>
    </div>
  );
}
