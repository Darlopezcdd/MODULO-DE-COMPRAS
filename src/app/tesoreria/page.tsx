'use client';

import { useState, useEffect } from 'react';
import { Banknote, CheckCircle2 } from 'lucide-react';

interface Saldo {
  id: number;
  proveedor_nombre: string;
  factura_numero: string;
  monto_credito: number;
  monto_pagado: number;
  saldo_pendiente: number;
  fecha_vencimiento: string | null;
  estado: string;
  proveedor_banco?: string;
  proveedor_tipo_cuenta?: string;
  proveedor_numero_cuenta?: string;
}

export default function TesoreriaPage() {
  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');
  
  // Estados para el Modal de Pago
  const [cuentasEmpresa, setCuentasEmpresa] = useState<any[]>([]);
  const [saldoSeleccionado, setSaldoSeleccionado] = useState<Saldo | null>(null);
  const [cuentaBancariaId, setCuentaBancariaId] = useState('');
  const [isPagarCargando, setIsPagarCargando] = useState(false);

  const fetchSaldos = async () => {
    try {
      const res = await fetch('/api/tesoreria');
      const result = await res.json();
      if (result.success) {
        setSaldos(result.data);
      }
    } catch (error) {
      console.error('Error fetching saldos:', error);
    } finally {
      setCargando(false);
    }
  };

  const fetchCuentas = async () => {
    try {
      const res = await fetch('/api/cuentas');
      const data = await res.json();
      if (data.success && data.data) {
        setCuentasEmpresa(data.data);
        if (data.data.length > 0) {
          setCuentaBancariaId(data.data[0].id);
        }
      }
    } catch (e) {
      console.error("Error al obtener cuentas bancarias", e);
    }
  };

  useEffect(() => {
    fetchSaldos();
    fetchCuentas();
  }, []);

  const handlePagarClick = (saldo: Saldo) => {
    setSaldoSeleccionado(saldo);
  };

  const handleConfirmarPago = async () => {
    if (!saldoSeleccionado || !cuentaBancariaId) {
      alert('Faltan datos para procesar el pago.');
      return;
    }

    setIsPagarCargando(true);
    try {
      const res = await fetch('/api/tesoreria/pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saldoId: saldoSeleccionado.id,
          cuentaBancariaId
        })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error al pagar');

      setAviso(`Pago registrado exitosamente. Nuevo saldo en cuenta: $${body.nuevoSaldoCta}`);
      setSaldos(prev => prev.filter(s => s.id !== saldoSeleccionado.id));
      setSaldoSeleccionado(null);
      setTimeout(() => setAviso(''), 5000);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsPagarCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Banknote className="w-10 h-10 text-purple-600" />
            Cuentas por Pagar (Tesorería)
          </h1>
        </div>

        {aviso && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> {aviso}
          </div>
        )}

        <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">Proveedor</th>
                <th className="p-4 text-sm font-semibold text-slate-600">No. Factura</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Vencimiento</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">Crédito Original</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">Saldo Pendiente</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-center">Estado</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">Cargando cuentas...</td>
                </tr>
              ) : saldos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                    <p>No hay cuentas por pagar pendientes.</p>
                  </td>
                </tr>
              ) : (
                saldos.map(s => {
                  const isVencido = s.estado === 'VENCIDO' || (s.fecha_vencimiento && new Date(s.fecha_vencimiento) < new Date());
                  
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">{s.proveedor_nombre}</td>
                      <td className="p-4 font-mono text-sm text-blue-600">{s.factura_numero}</td>
                      <td className="p-4 text-slate-500">
                        {s.fecha_vencimiento ? new Date(s.fecha_vencimiento).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 text-right text-slate-600 font-medium">
                        ${s.monto_credito.toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-mono text-rose-600 font-bold">
                        ${s.saldo_pendiente.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isVencido ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isVencido ? 'VENCIDO' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handlePagarClick(s)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                          Pagar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {saldoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Procesar Pago a Proveedor</h3>
            
            <div className="mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Pagando a:</p>
              <p className="font-semibold text-slate-900">{saldoSeleccionado.proveedor_nombre}</p>
              <p className="text-sm font-mono text-slate-600 mt-1">Factura: {saldoSeleccionado.factura_numero}</p>
              
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Monto Pendiente</p>
                  <p className="text-lg font-bold text-rose-600">${saldoSeleccionado.saldo_pendiente.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="mb-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Datos Bancarios del Proveedor</h4>
              <div className="text-sm text-slate-700 space-y-1">
                <p><span className="text-slate-500">Banco:</span> {saldoSeleccionado.proveedor_banco || 'No registrado'}</p>
                <p><span className="text-slate-500">Tipo Cta:</span> {saldoSeleccionado.proveedor_tipo_cuenta || 'No registrado'}</p>
                <p><span className="text-slate-500">No. Cta:</span> {saldoSeleccionado.proveedor_numero_cuenta || 'No registrado'}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Cuenta Origen (Nuestra)</label>
              <select
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                value={cuentaBancariaId}
                onChange={(e) => setCuentaBancariaId(e.target.value)}
              >
                {cuentasEmpresa.map(c => (
                  <option key={c.id} value={c.id}>{c.banco} - {c.tipoCuenta} ({c.numeroCuenta}) - Saldo: ${c.saldo}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => setSaldoSeleccionado(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPagarCargando}
                onClick={handleConfirmarPago}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium shadow-sm flex items-center gap-2"
              >
                {isPagarCargando ? "Procesando..." : "Confirmar y Pagar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
