'use client';

// src/components/molecules/Breadcrumbs.tsx
// Molécula — Breadcrumbs globales para navegación
// Atomic Design: Componente de navegación usando la paleta institucional UTN

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import React from 'react';

export default function Breadcrumbs() {
  const pathname = usePathname();

  // Si no hay ruta o estamos en la raíz (ej. un Dashboard futuro), no mostrar breadcrumbs
  if (!pathname || pathname === '/') {
    return null;
  }

  // Dividir la ruta en segmentos ignorando vacíos
  const pathSegments = pathname.split('/').filter((segment) => segment !== '');

  // Función para capitalizar los textos de la ruta
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  return (
    <nav className="flex items-center text-sm mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {/* Enlace al Home */}
        <li>
          <Link
            href="/"
            className="flex items-center text-slate-500 hover:text-[#d20a11] transition-colors"
            title="Inicio"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>

        {/* Generación dinámica de los segmentos */}
        {pathSegments.map((segment, index) => {
          // Reconstruir la ruta acumulada hasta este segmento
          const href = '/' + pathSegments.slice(0, index + 1).join('/');
          
          // Verificar si es el último segmento (la página actual)
          const isLast = index === pathSegments.length - 1;
          
          // Formatear el texto (ej. "nuevo-proveedor" -> "Nuevo-proveedor")
          const label = decodeURIComponent(segment).replace(/-/g, ' ');

          // Lista de rutas intermedias que no tienen página propia y no deben ser clickeables
          const nonClickablePaths = ['/proveedores/editar'];
          const isClickable = !nonClickablePaths.includes(href);

          return (
            <React.Fragment key={href}>
              <li>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </li>
              <li>
                {isLast ? (
                  // Texto estático para la página actual
                  <span
                    className="font-semibold"
                    style={{ color: '#d20a11' }}
                    aria-current="page"
                  >
                    {capitalize(label)}
                  </span>
                ) : isClickable ? (
                  // Enlace para los segmentos anteriores
                  <Link
                    href={href}
                    className="font-medium text-slate-500 hover:text-[#706f6f] transition-colors"
                  >
                    {capitalize(label)}
                  </Link>
                ) : (
                  // Texto estático para rutas intermedias no clickeables
                  <span className="font-medium text-slate-400 cursor-default">
                    {capitalize(label)}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
