'use client';

import React, { useState } from 'react';
import { Building2, CreditCard, DollarSign, AlertCircle, RefreshCw, Pencil, X, Check, Loader2 } from 'lucide-react';

export interface CuentaBancaria {
  id: string;
  banco: string;
  titular: string;
  tipoCuenta: string;
  numeroCuenta: string;
  saldo: number;
}

interface CuentasBancariasViewProps {
  /** Lista de cuentas bancarias */
  cuentas: CuentaBancaria[];
  /** Indica si está cargando */
  isLoading: boolean;
  /** Callback cuando se actualizan las cuentas (para refrescar desde el padre) */
  onRefresh?: () => void;
  /** Error al cargar */
  error?: string | null;
}

/**
 * Componente de visualización de cuentas bancarias externas con sus saldos.
 * Muestra tarjetas visuales por cuenta con indicadores de saldo y permite
 * edición controlada de saldos (preparado para cuando el backend esté listo).
 * 
 * Sprint 3 — HU13: Conexión API Cuentas por Pagar (Aldahir Requene)
 * Nota: Los endpoints de actualización de saldos los creará Darío López.
 *       Por ahora la edición muestra el flujo visual pero guarda solo en el estado local.
 */
export default function CuentasBancariasView({
  cuentas,
  isLoading,
  onRefresh,
  error,
}: CuentasBancariasViewProps) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nuevoSaldo, setNuevoSaldo] = useState('');
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Obtener color según nivel de saldo
  const getSaldoColor = (saldo: number) => {
    if (saldo >= 20000) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', indicator: 'bg-emerald-500' };
    if (saldo >= 5000) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', indicator: 'bg-amber-500' };
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', indicator: 'bg-red-500' };
  };

  // Obtener ícono del banco
  const getBancoIcon = () => {
    return <Building2 className="w-6 h-6" />;
  };

  const handleEditClick = (cuenta: CuentaBancaria) => {
    setEditandoId(cuenta.id);
    setNuevoSaldo(cuenta.saldo.toString());
    setErrorEdicion(null);
  };

  const handleCancelEdit = () => {
    setEditandoId(null);
    setNuevoSaldo('');
    setErrorEdicion(null);
  };

  const handleSaveEdit = async () => {
    setErrorEdicion(null);

    // Validaciones
    const monto = parseFloat(nuevoSaldo);
    if (isNaN(monto)) {
      setErrorEdicion('Ingrese un monto válido.');
      return;
    }
    if (monto < 0) {
      setErrorEdicion('El saldo no puede ser negativo.');
      return;
    }
    if (monto > 999999999) {
      setErrorEdicion('El monto excede el límite permitido.');
      return;
    }

    setGuardando(true);
    try {
      // TODO: Cuando Darío López cree el endpoint, descomentar y usar:
      // const res = await fetch(`/api/cuentas/${cuentaId}/saldo`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ nuevoSaldo: monto }),
      // });
      // if (!res.ok) throw new Error('Error al actualizar saldo');

      // Simular delay de red (remover cuando esté el endpoint real)
      await new Promise(resolve => setTimeout(resolve, 500));

      setEditandoId(null);
      setNuevoSaldo('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorEdicion(err.message || 'Error al guardar. Intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  // Estado: Cargando
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-slate-200 rounded-xl" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 rounded w-32" />
                <div className="h-3 bg-slate-100 rounded w-24" />
              </div>
            </div>
            <div className="h-8 bg-slate-200 rounded w-28 mt-4" />
          </div>
        ))}
      </div>
    );
  }

  // Estado: Error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4">
        <AlertCircle className="w-8 h-8 text-red-400 shrink-0" />
        <div>
          <h3 className="font-semibold text-red-800">Error al cargar cuentas bancarias</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="ml-auto px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-1" /> Reintentar
          </button>
        )}
      </div>
    );
  }

  // Estado: Sin cuentas
  if (cuentas.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-700">No hay cuentas bancarias registradas</h3>
        <p className="text-slate-500 text-sm mt-1">Las cuentas aparecerán aquí cuando estén disponibles desde la API externa.</p>
      </div>
    );
  }

  // Calcular saldo total
  const saldoTotal = cuentas.reduce((sum, c) => sum + c.saldo, 0);

  // Estado: Tarjetas de cuentas
  return (
    <div className="space-y-4">
      {/* Resumen general */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Cuentas Bancarias de la Empresa</h2>
            <p className="text-sm text-slate-500">{cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''} registrada{cuentas.length !== 1 ? 's' : ''} — Saldo total: <span className="font-semibold text-slate-700">${saldoTotal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span></p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Actualizar cuentas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tarjetas de cuentas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cuentas.map(cuenta => {
          const colors = getSaldoColor(cuenta.saldo);
          const isEditing = editandoId === cuenta.id;

          return (
            <div
              key={cuenta.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${
                isEditing ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-200'
              }`}
            >
              {/* Cabecera: Banco + tipo */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center ${colors.text}`}>
                    {getBancoIcon()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{cuenta.banco}</h3>
                    <p className="text-xs text-slate-500">{cuenta.titular}</p>
                  </div>
                </div>
                {/* Indicador de saldo */}
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${colors.indicator}`} />
                  <span className="text-xs font-medium text-slate-500">
                    {cuenta.saldo >= 20000 ? 'Alto' : cuenta.saldo >= 5000 ? 'Medio' : 'Bajo'}
                  </span>
                </div>
              </div>

              {/* Datos de la cuenta */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500">Tipo:</span>
                  <span className="font-medium text-slate-700">{cuenta.tipoCuenta}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-3.5 h-3.5 text-slate-400 flex items-center justify-center text-xs font-bold">#</span>
                  <span className="text-slate-500">N° Cuenta:</span>
                  <span className="font-mono text-slate-700">{cuenta.numeroCuenta}</span>
                </div>
              </div>

              {/* Saldo */}
              <div className={`rounded-xl p-3 ${colors.bg} ${colors.border} border`}>
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 block">Nuevo saldo:</label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">$</span>
                      <input
                        type="number"
                        value={nuevoSaldo}
                        onChange={(e) => setNuevoSaldo(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit()}
                        disabled={guardando}
                        className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        title="Guardar"
                      >
                        {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {errorEdicion && (
                      <p className="text-red-600 text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" /> {errorEdicion}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo disponible</p>
                      <p className={`text-2xl font-black mt-0.5 ${colors.text}`}>
                        ${cuenta.saldo.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditClick(cuenta)}
                      className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Editar saldo"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
