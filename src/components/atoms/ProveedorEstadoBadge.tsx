// src/components/atoms/ProveedorEstadoBadge.tsx
// Átomo — Badge de estado del proveedor con colores institucionales UTN
// ACTIVO   → verde (institucional confianza)
// INACTIVO → naranja UTN (#E65100) indicando alerta/desactivado

interface Props {
  estado: 'ACTIVO' | 'INACTIVO' | string;
}

export default function ProveedorEstadoBadge({ estado }: Props) {
  const esActivo = estado === 'ACTIVO';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
        border tracking-wide uppercase
        ${esActivo
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'border-[#E65100]/30 text-[#E65100]'
        }
      `}
      style={!esActivo ? { backgroundColor: 'rgba(230,81,0,0.08)' } : undefined}
    >
      {/* Punto de estado */}
      <span
        className={`w-1.5 h-1.5 rounded-full ${esActivo ? 'bg-emerald-500' : 'bg-[#E65100]'}`}
      />
      {estado}
    </span>
  );
}
