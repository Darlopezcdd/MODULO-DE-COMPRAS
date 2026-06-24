import FacturaForm from "@/components/FacturaForm";
import { Suspense } from "react";

export default function NuevaFacturaPage() {
  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Nueva Factura de Compra
          </h1>
          <p className="text-slate-500 mt-1">Complete la cabecera y agregue los productos al detalle.</p>
        </div>

        <Suspense fallback={<div className="p-4 text-center">Cargando formulario...</div>}>
          {/* Formulario Integrado (Cabecera y Detalle de Productos) */}
          <FacturaForm />
        </Suspense>
      </div>
    </div>
  );
}
