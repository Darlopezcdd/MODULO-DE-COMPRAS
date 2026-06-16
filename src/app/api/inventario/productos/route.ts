// src/app/api/inventario/productos/route.ts
// HU3 — Mock inicial de API de Inventario (Mocking con IA — Aldahir Requene)
// Estructura preparada para conectar con el módulo real de Inventarios (Jairo Farinango)

import { NextResponse } from 'next/server';

export interface ProductoInventario {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  pvp: number;
  grabaIva: boolean;
  porcentajeIva: number;
  stock: number;
  unidad: string;
}

// ── Dataset Mock (20 productos) ───────────────────────────────────────────────
const PRODUCTOS_MOCK: ProductoInventario[] = [
  { id: 1,  codigo: 'PAP-001', nombre: 'Papel Bond A4 Resma 500 Hojas',    categoria: 'Papelería',    pvp: 4.50,   grabaIva: true,  porcentajeIva: 15, stock: 250,  unidad: 'Resma' },
  { id: 2,  codigo: 'PAP-002', nombre: 'Carpeta Archivadora Oficio',        categoria: 'Papelería',    pvp: 2.75,   grabaIva: true,  porcentajeIva: 15, stock: 180,  unidad: 'Unidad' },
  { id: 3,  codigo: 'TEC-001', nombre: 'Tóner HP LaserJet 85A Negro',       categoria: 'Tecnología',   pvp: 42.00,  grabaIva: true,  porcentajeIva: 15, stock: 35,   unidad: 'Unidad' },
  { id: 4,  codigo: 'TEC-002', nombre: 'Mouse Inalámbrico USB',             categoria: 'Tecnología',   pvp: 18.50,  grabaIva: true,  porcentajeIva: 15, stock: 60,   unidad: 'Unidad' },
  { id: 5,  codigo: 'TEC-003', nombre: 'Teclado USB Español',               categoria: 'Tecnología',   pvp: 22.00,  grabaIva: true,  porcentajeIva: 15, stock: 45,   unidad: 'Unidad' },
  { id: 6,  codigo: 'LIM-001', nombre: 'Desinfectante Multiusos 1L',        categoria: 'Limpieza',     pvp: 3.20,   grabaIva: false, porcentajeIva: 0,  stock: 400,  unidad: 'Litro' },
  { id: 7,  codigo: 'LIM-002', nombre: 'Papel Higiénico 48 rollos',         categoria: 'Limpieza',     pvp: 18.90,  grabaIva: false, porcentajeIva: 0,  stock: 120,  unidad: 'Paquete' },
  { id: 8,  codigo: 'LIM-003', nombre: 'Jabón Líquido Antibacterial 500ml', categoria: 'Limpieza',     pvp: 4.10,   grabaIva: false, porcentajeIva: 0,  stock: 200,  unidad: 'Unidad' },
  { id: 9,  codigo: 'MUE-001', nombre: 'Silla de Oficina Ergonómica',       categoria: 'Muebles',      pvp: 185.00, grabaIva: true,  porcentajeIva: 15, stock: 10,   unidad: 'Unidad' },
  { id: 10, codigo: 'MUE-002', nombre: 'Escritorio Ejecutivo 140cm',        categoria: 'Muebles',      pvp: 320.00, grabaIva: true,  porcentajeIva: 15, stock: 5,    unidad: 'Unidad' },
  { id: 11, codigo: 'ALI-001', nombre: 'Café Soluble Nescafé 200g',         categoria: 'Alimentación', pvp: 6.80,   grabaIva: false, porcentajeIva: 0,  stock: 90,   unidad: 'Unidad' },
  { id: 12, codigo: 'ALI-002', nombre: 'Azúcar Blanca 2kg',                 categoria: 'Alimentación', pvp: 2.40,   grabaIva: false, porcentajeIva: 0,  stock: 150,  unidad: 'Funda' },
  { id: 13, codigo: 'ALI-003', nombre: 'Agua Purificada 20L Botellón',      categoria: 'Alimentación', pvp: 2.00,   grabaIva: false, porcentajeIva: 0,  stock: 80,   unidad: 'Unidad' },
  { id: 14, codigo: 'ELE-001', nombre: 'Extensión Eléctrica 5 Tomas 3m',   categoria: 'Eléctrico',    pvp: 12.50,  grabaIva: true,  porcentajeIva: 15, stock: 40,   unidad: 'Unidad' },
  { id: 15, codigo: 'ELE-002', nombre: 'Foco LED 15W E27',                  categoria: 'Eléctrico',    pvp: 3.90,   grabaIva: true,  porcentajeIva: 15, stock: 300,  unidad: 'Unidad' },
  { id: 16, codigo: 'PAP-003', nombre: 'Bolígrafos BIC Azul Caja x12',      categoria: 'Papelería',    pvp: 3.60,   grabaIva: true,  porcentajeIva: 15, stock: 500,  unidad: 'Caja' },
  { id: 17, codigo: 'PAP-004', nombre: 'Marcadores Pizarrón x4 Colores',    categoria: 'Papelería',    pvp: 4.20,   grabaIva: true,  porcentajeIva: 15, stock: 120,  unidad: 'Set' },
  { id: 18, codigo: 'TEC-004', nombre: 'Disco Duro Externo 1TB USB 3.0',    categoria: 'Tecnología',   pvp: 75.00,  grabaIva: true,  porcentajeIva: 15, stock: 20,   unidad: 'Unidad' },
  { id: 19, codigo: 'SEG-001', nombre: 'Extintor PQS 10 Libras',            categoria: 'Seguridad',    pvp: 45.00,  grabaIva: true,  porcentajeIva: 15, stock: 15,   unidad: 'Unidad' },
  { id: 20, codigo: 'SEG-002', nombre: 'Casco de Seguridad Industrial',     categoria: 'Seguridad',    pvp: 12.00,  grabaIva: true,  porcentajeIva: 15, stock: 50,   unidad: 'Unidad' },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const buscar  = (searchParams.get('buscar')  ?? '').toLowerCase().trim();
    const pagina  = Math.max(1, parseInt(searchParams.get('pagina')  ?? '1'));
    const limite  = Math.min(50, Math.max(1, parseInt(searchParams.get('limite') ?? '10')));

    // Filtrar por búsqueda (nombre o código)
    let resultados = PRODUCTOS_MOCK;
    if (buscar) {
      resultados = PRODUCTOS_MOCK.filter(
        p => p.nombre.toLowerCase().includes(buscar) ||
             p.codigo.toLowerCase().includes(buscar) ||
             p.categoria.toLowerCase().includes(buscar)
      );
    }

    // Paginación
    const total       = resultados.length;
    const totalPaginas = Math.ceil(total / limite);
    const inicio      = (pagina - 1) * limite;
    const data        = resultados.slice(inicio, inicio + limite);

    return NextResponse.json({
      success: true,
      data,
      total,
      pagina,
      limite,
      totalPaginas,
      // Metadatos para que la integración real de Jairo use la misma estructura
      _meta: { fuente: 'mock', version: '1.0.0' },
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Error al obtener productos de inventario.', details: error.message },
      { status: 500 }
    );
  }
}
