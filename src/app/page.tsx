import ProveedorForm from "@/components/ProveedorForm";
import FacturaForm from "@/components/FacturaForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-2">Módulo de Compras</h1>
        <p className="text-muted-foreground">Prueba de Formularios con Validación</p>
      </header>
      
      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl font-semibold mb-6 text-center">Proveedor</h2>
          <ProveedorForm />
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-6 text-center">Factura</h2>
          <div className="glass-panel p-8 rounded-xl max-w-2xl mx-auto">
            <FacturaForm />
          </div>
        </section>
      </main>
    </div>
  );
}
