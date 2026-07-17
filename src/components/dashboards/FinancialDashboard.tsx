import React, { useEffect, useState } from 'react';
import { Banknote, AlertTriangle, ArrowUpRight, TrendingUp, DollarSign, CalendarX, FileText, Check } from 'lucide-react';
import Link from 'next/link';

export default function FinancialDashboard() {
  const [saldos, setSaldos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [metricas, setMetricas] = useState({
    totalDeuda: 0,
    vencidos: 0,
    montoVencido: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/tesoreria');
        const data = await res.json();
        
        if (data.success && data.data) {
          setSaldos(data.data);
          
          let totalDeuda = 0;
          let vencidos = 0;
          let montoVencido = 0;
          
          data.data.forEach((s: any) => {
            totalDeuda += s.saldo_pendiente;
            if (s.estado === 'VENCIDO' || (s.fecha_vencimiento && new Date(s.fecha_vencimiento) < new Date())) {
              vencidos++;
              montoVencido += s.saldo_pendiente;
            }
          });
          
          setMetricas({ totalDeuda, vencidos, montoVencido });
        }
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setCargando(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600 shrink-0">
            <DollarSign className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Deuda Total Pendiente</p>
            <h3 className="text-3xl font-black text-slate-900">${metricas.totalDeuda.toFixed(2)}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-rose-100 p-4 rounded-xl text-rose-600 shrink-0">
            <CalendarX className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Monto Vencido</p>
            <h3 className="text-3xl font-black text-slate-900">${metricas.montoVencido.toFixed(2)}</h3>
            <p className="text-xs text-rose-500 font-medium">{metricas.vencidos} cuentas atrasadas</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-slate-100 p-4 rounded-xl text-slate-600 shrink-0">
            <Banknote className="w-8 h-8" />
          </div>
          <div className="flex flex-col items-start">
            <p className="text-sm font-medium text-slate-500 mb-1">Centro de Pagos</p>
            <Link href="/tesoreria" className="inline-flex items-center gap-2 text-slate-800 font-bold hover:text-[#d20a11] transition-colors">
              Ir a Tesorería <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Próximos Vencimientos
          </h2>
          <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            Top 5 Urgentes
          </span>
        </div>
        
        <div className="p-0 overflow-x-auto">
          {cargando ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          ) : saldos.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
              <p className="font-medium text-lg text-slate-700">No hay deudas pendientes</p>
              <p>Todas las cuentas están al día.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Proveedor</th>
                  <th className="px-6 py-4">Factura</th>
                  <th className="px-6 py-4">Vencimiento</th>
                  <th className="px-6 py-4 text-right">Saldo</th>
                  <th className="px-6 py-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {saldos.slice(0, 5).map((saldo) => (
                  <tr key={saldo.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{saldo.proveedor_nombre}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-mono font-medium border border-slate-200">
                        {saldo.factura_numero}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {saldo.fecha_vencimiento ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          saldo.estado === 'VENCIDO' || new Date(saldo.fecha_vencimiento) < new Date()
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {new Date(saldo.fecha_vencimiento).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Sin fecha</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      ${saldo.saldo_pendiente.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href="/tesoreria" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm hover:underline">
                        Pagar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
