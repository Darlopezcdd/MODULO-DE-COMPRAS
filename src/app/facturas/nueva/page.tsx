import FacturaForm from "@/components/FacturaForm";
import ProductosDataGrid from "@/components/ProductosDataGrid";

export default function NuevaFacturaPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Nueva Factura de Compra
          </h1>
          <p className="text-slate-400 mt-1">Complete la cabecera y agregue los productos al detalle.</p>
        </div>

        {/* Cabecera de Factura (HU2) */}
        <FacturaForm />

        {/* Detalle de Productos — DataGrid (HU3 — Aldahir Requene) */}
        <div className="mt-6">
          <ProductosDataGrid />
        </div>
      </div>
    </div>
  );
}
