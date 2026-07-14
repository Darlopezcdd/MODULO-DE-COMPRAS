'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, KeyRound, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const MIN_PASSWORD_LENGTH = 8;

export default function RecuperarPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Helper para parsear respuestas de forma segura
  async function safeJson(res: Response) {
    try {
      return await res.json();
    } catch {
      return { success: false, message: 'Respuesta inválida del servidor' };
    }
  }

  // Step 1: Request Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await safeJson(res);

      if (!res.ok || !data.success) {
        setError(data.message || 'Error al solicitar el código');
      } else {
        setSuccessMsg(data.message || 'Código enviado al correo');
        setStep(2);
      }
    } catch (err) {
      console.error('Error al solicitar código:', err);
      setError('Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo })
      });
      const data = await safeJson(res);

      if (!res.ok || !data.success) {
        setError(data.message || 'Código inválido');
      } else {
        setSuccessMsg(data.message || 'Código verificado correctamente');
        setStep(3);
      }
    } catch (err) {
      console.error('Error al verificar código:', err);
      setError('Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar código desde el paso 2
  const handleResendCode = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await safeJson(res);

      if (!res.ok || !data.success) {
        setError(data.message || 'No se pudo reenviar el código');
      } else {
        setSuccessMsg('Código reenviado a tu correo');
      }
    } catch (err) {
      console.error('Error al reenviar código:', err);
      setError('Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo, new_password: newPassword })
      });
      const data = await safeJson(res);

      if (!res.ok || !data.success) {
        setError(data.message || 'Error al cambiar la contraseña');
      } else {
        setSuccessMsg(data.message || 'Contraseña actualizada con éxito. Redirigiendo...');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      setError('Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const isPasswordWeak = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#d20a11]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#706f6f]/10 rounded-full blur-3xl" />

      <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl p-10 w-full max-w-md relative z-10 rounded-3xl">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Recuperar <span className="text-[#d20a11]">Contraseña</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {step === 1 && "Ingresa tu correo para recibir un código"}
            {step === 2 && "Ingresa el código que enviamos a tu correo"}
            {step === 3 && "Crea una nueva contraseña segura"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-4 text-sm font-medium text-center animate-in fade-in">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded-xl mb-4 text-sm font-medium text-center animate-in fade-in flex items-center justify-center gap-2">
            <CheckCircle2 size={18} />
            {successMsg}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d20a11]/50 focus:border-[#d20a11] transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="usuario@ejemplo.com"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full flex justify-center items-center gap-2 bg-[#d20a11] hover:bg-[#b0080d] text-white py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Enviando...' : 'Solicitar Código'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Código de Recuperación</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound size={18} />
                </div>
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d20a11]/50 focus:border-[#d20a11] transition-all tracking-widest uppercase disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="A1B2C3"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !codigo}
              className="w-full flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verificando...' : 'Verificar Código'}
            </button>
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setSuccessMsg(''); }}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                Usar otro correo
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleResendCode}
                className="text-sm font-medium text-[#d20a11] hover:text-[#b0080d] transition-colors disabled:opacity-50"
              >
                Reenviar código
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nueva Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d20a11]/50 focus:border-[#d20a11] transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-[#d20a11] transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isPasswordWeak && (
                <p className="text-xs text-amber-600 mt-1">Mínimo {MIN_PASSWORD_LENGTH} caracteres</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmar Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d20a11]/50 focus:border-[#d20a11] transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="••••••••"
                />
              </div>
              {passwordsMismatch && (
                <p className="text-xs text-amber-600 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <button
              type="submit"
              disabled={
                isLoading ||
                !newPassword ||
                !confirmPassword ||
                newPassword.length < MIN_PASSWORD_LENGTH ||
                newPassword !== confirmPassword
              }
              className="w-full flex justify-center items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
            </button>
          </form>
        )}

        {step !== 3 && (
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#d20a11] transition-colors"
            >
              <ArrowLeft size={16} />
              Volver a Iniciar Sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}