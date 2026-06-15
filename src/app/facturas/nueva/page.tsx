import FacturaForm from "@/components/FacturaForm";

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
        </div>
      </div>
    </div>
  );
}
