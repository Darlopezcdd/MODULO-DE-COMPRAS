import FacturaForm from "@/components/FacturaForm";
<<<<<<< HEAD

export default function NuevaFacturaPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">
          Nueva Factura de Compra
        </h1>
        <FacturaForm />
        
        {/* Aquí iría el detalle de la factura y productos que no es parte de HU2 */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-gray-500 text-center">
          (Detalle de productos - Próximamente)
=======
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
>>>>>>> origin/main
        </div>
      </div>
    </div>
  );
}
