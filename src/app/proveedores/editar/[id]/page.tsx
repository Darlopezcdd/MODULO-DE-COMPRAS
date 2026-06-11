'use client';

import ProveedorForm from '@/components/ProveedorForm';
import { useEffect, useState } from 'react';

export default function EditarProveedorPage({ params }: { params: { id: string } }) {
  const [defaultValues, setDefaultValues] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProveedor = async () => {
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query Obtener($id: Int!) {
              obtenerProveedor(id: $id) {
                cedulaRuc
                nombre
                ciudad
                tipo
                direccion
                telefono
                email
              }
            }
          `,
          variables: { id: parseInt(params.id) },
        }),
      });
      const data = await res.json();
      if (data.data?.obtenerProveedor) {
        setDefaultValues(data.data.obtenerProveedor);
      }
      setLoading(false);
    };
    fetchProveedor();
  }, [params.id]);

  if (loading) return <div className="min-h-screen bg-background p-8 text-white">Cargando...</div>;
  if (!defaultValues) return <div className="min-h-screen bg-background p-8 text-white">Proveedor no encontrado</div>;

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <ProveedorForm isEdit id={parseInt(params.id)} defaultValues={defaultValues} />
    </div>
  );
}
