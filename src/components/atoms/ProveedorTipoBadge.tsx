// src/components/atoms/ProveedorTipoBadge.tsx
// Átomo — Badge de tipo de proveedor con colores institucionales UTN
// CONTADO → azul principal UTN (#003366)
// CREDITO → celeste secundario UTN (#4A90E2)

interface Props {
  tipo: 'CONTADO' | 'CREDITO' | string;
}

export default function ProveedorTipoBadge({ tipo }: Props) {
  const esContado = tipo === 'CONTADO';

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border tracking-wide uppercase"
      style={
        esContado
          ? {
              backgroundColor: 'rgba(112,111,111,0.08)',
              color: '#706f6f',
              borderColor: 'rgba(112,111,111,0.25)',
            }
          : {
              backgroundColor: 'rgba(210,10,17,0.10)',
              color: '#d20a11',
              borderColor: 'rgba(210,10,17,0.30)',
            }
      }
    >
      {tipo}
    </span>
  );
}
