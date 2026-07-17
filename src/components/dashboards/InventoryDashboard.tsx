import React, { useEffect, useState } from 'react';
import { PackageSearch, AlertTriangle, Check, ShoppingCart, Activity, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InventoryDashboard({ user }: { user: any }) {
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [metricas, setMetricas] = useState({
    alertasCriticas: 0,
    proveedoresActivos: 0
  });
  const [activeTab, setActiveTab] = useState<'CRITICO' | 'TODO'>('CRITICO');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, provRes] = await Promise.all([
          fetch('/api/inventarios?limite=200'),
          fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ listarProveedores(estado: ACTIVO) { id } }' })
          })
        ]);
        
        const [invData, provData] = await Promise.all([
          invRes.json(),
          provRes.json()
        ]);
        
        let productosList = [];
        if (invData.success) {
          productosList = invData.data.sort((a: any, b: any) => a.stockActual - b.stockActual);
          setProductos(productosList);
        }

        const proveedoresActivos = provData?.data?.listarProveedores?.length || 0;
        
        setMetricas({
          proveedoresActivos,
          alertasCriticas: productosList.filter((p: any) => p.stockActual === 0).length
        });
      } catch (e) {
        console.error("Error al cargar inventario", e);
      } finally {
        setCargando(false);
      }
    };
    fetchData();
  }, []);

  const handleProductClick = (codigo: string) => {
    if (user?.permisos?.crear_facturas || user?.rol === 'ADMIN') {
      router.push(`/facturas/nueva?producto=${encodeURIComponent(codigo)}`);
    } else {
      alert('No tienes permisos para crear facturas de compra.');
    }
  };

  const productosFiltrados = activeTab === 'CRITICO' 
    ? productos.filter(p => p.stockActual <= 5)
    : productos;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {!cargando && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="bg-rose-100 p-4 rounded-xl text-rose-600 shrink-0">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Alertas Críticas de Stock</p>
              <h3 className="text-3xl font-black text-slate-900">{metricas.alertasCriticas}</h3>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="bg-blue-100 p-4 rounded-xl text-blue-600 shrink-0">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Proveedores Activos</p>
              <h3 className="text-3xl font-black text-slate-900">{metricas.proveedoresActivos}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4 shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <PackageSearch className="w-5 h-5 text-[#d20a11]" /> Estado del Inventario Global
            </h2>
            <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
              {productosFiltrados.length} productos
            </span>
          </div>
          
          <div className="flex bg-slate-200/50 p-1 rounded-lg self-start">
            <button 
              onClick={() => setActiveTab('CRITICO')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === 'CRITICO' 
                  ? 'bg-white text-rose-600 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Atención Inmediata
              {productos.filter(p => p.stockActual <= 5).length > 0 && (
                <span className="bg-rose-100 text-rose-700 py-0.5 px-2 rounded-full text-xs font-bold">
                  {productos.filter(p => p.stockActual <= 5).length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('TODO')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'TODO' 
                  ? 'bg-white text-[#d20a11] shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              Catálogo Completo
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
          {cargando ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-[#d20a11] rounded-full animate-spin mb-4"></div>
              <p>Sincronizando inventario...</p>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-4 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-emerald-500" />
              </div>
              <p className="text-xl font-medium text-slate-700">Todo está bajo control</p>
              <p className="mt-2">No hay productos en estado crítico actualmente. Buen trabajo manteniendo el stock.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {productosFiltrados.map((prod) => {
                const isUrgent = prod.stockActual === 0;
                const isWarning = prod.stockActual > 0 && prod.stockActual <= 5;
                
                return (
                  <div
                    key={prod.codigo}
                    className={`flex flex-col text-left p-5 rounded-xl border transition-all shadow-sm bg-white hover:-translate-y-1 ${
                      isUrgent 
                        ? 'border-rose-300 shadow-rose-100 hover:shadow-rose-200' 
                        : isWarning
                          ? 'border-amber-300 shadow-amber-100 hover:shadow-amber-200'
                          : 'border-slate-200 hover:border-[#d20a11] hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full mb-3">
                      <span className={`text-xs font-mono px-2 py-1 rounded-md font-semibold ${
                        isUrgent ? 'bg-rose-100 text-rose-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {prod.codigo}
                      </span>
                      {isUrgent && (
                        <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> AGOTADO
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-slate-900 truncate w-full mb-4 text-base" title={prod.nombre}>
                      {prod.nombre}
                    </h3>
                    
                    <div className="flex items-center justify-between w-full mb-5">
                      <span className="text-sm font-medium text-slate-500">Stock en Bodega:</span>
                      <span className={`text-3xl font-black ${
                        isUrgent ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-700'
                      }`}>
                        {prod.stockActual}
                      </span>
                    </div>
                    
                    {user?.permisos?.crear_facturas && (
                      <button
                        onClick={() => handleProductClick(prod.codigo)}
                        className={`mt-auto w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all ${
                          isUrgent
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200'
                            : 'bg-[#d20a11] hover:bg-[#b0080e] text-white shadow-md shadow-red-100'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Reabastecer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
