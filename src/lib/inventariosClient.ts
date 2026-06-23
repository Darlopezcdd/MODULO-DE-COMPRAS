/**
 * Cliente de integración con el Módulo de Inventarios
 * ====================================================
 * API Base: https://api-inventario-v1gh.onrender.com
 *
 * Endpoints disponibles:
 *   GET /api/productos          → Todos los productos (incluye inactivos)
 *   GET /api/productos/catalogo → Solo productos activos (con % IVA)
 */

// ── Tipos que devuelve la API externa ───────────────────────────────

/** Respuesta de /api/productos (lista completa) */
export interface ProductoAPICompleto {
  codigo: string;
  nombre: string;
  descripcion: string;
  graba_iva: boolean;
  costo: string;
  pvp: string;
  estado: string;        // "Activo" | "Inactivo"
  stock_actual: number;
}

/** Respuesta de /api/productos/catalogo (solo activos) */
export interface ProductoAPICatalogo {
  codigo: string;
  nombre: string;
  descripcion: string;
  stock_actual: number;
  pvp: string;
  graba_iva: boolean;
  porcentaje_iva_aplicado: number;
}

// ── Tipo normalizado que usa nuestra app ────────────────────────────

export interface ProductoInventarioNormalizado {
  codigo: string;
  nombre: string;
  descripcion: string;
  stockActual: number;
  precioUnitario: number;
  costo: number;
  grabaIva: boolean;
  porcentajeIva: number;
  estado: string;
}

export interface InventariosResponse {
  success: boolean;
  data: ProductoInventarioNormalizado[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

// ── Configuración ───────────────────────────────────────────────────

const BASE_URL = 'https://api-inventario-v1gh.onrender.com';

// ── Normalización ───────────────────────────────────────────────────

function normalizarDesdeProductos(p: ProductoAPICompleto): ProductoInventarioNormalizado {
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion,
    stockActual: Number(p.stock_actual) || 0,
    precioUnitario: parseFloat(p.pvp) || 0,
    costo: parseFloat(p.costo) || 0,
    grabaIva: Boolean(p.graba_iva),
    porcentajeIva: p.graba_iva ? 15 : 0,  // La API de productos no envía %, usamos 15 por defecto
    estado: p.estado || 'Activo',
  };
}

function normalizarDesdeCatalogo(p: ProductoAPICatalogo): ProductoInventarioNormalizado {
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion,
    stockActual: Number(p.stock_actual) || 0,
    precioUnitario: parseFloat(p.pvp) || 0,
    costo: 0,  // El catálogo no devuelve costo
    grabaIva: Boolean(p.graba_iva),
    porcentajeIva: Number(p.porcentaje_iva_aplicado) || 0,
    estado: 'Activo',  // El catálogo solo devuelve activos
  };
}

// ── Cache en memoria ────────────────────────────────────────────────

let cacheCatalogo: { data: ProductoInventarioNormalizado[]; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 60 segundos

// ── Fetch principal con fallback ────────────────────────────────────

async function fetchProductos(): Promise<ProductoInventarioNormalizado[]> {
  if (cacheCatalogo && Date.now() - cacheCatalogo.timestamp < CACHE_TTL) {
    return cacheCatalogo.data;
  }

  // Intentar primero con /api/productos/catalogo (más datos de IVA)
  try {
    const res = await fetch(`${BASE_URL}/api/productos/catalogo`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const body = await res.json();
      const externos: ProductoAPICatalogo[] = body.data ?? [];
      const normalizados = externos.map(normalizarDesdeCatalogo);
      cacheCatalogo = { data: normalizados, timestamp: Date.now() };
      return normalizados;
    }
  } catch (err) {
    console.warn('[Inventarios] Falló /api/productos/catalogo, intentando fallback...', err);
  }

  // Fallback a /api/productos (lista completa)
  try {
    const res = await fetch(`${BASE_URL}/api/productos`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`API Inventarios respondió ${res.status} ${res.statusText}`);
    }

    const body = await res.json();
    const externos: ProductoAPICompleto[] = body.data ?? [];
    // Filtrar solo activos
    const activos = externos.filter(p => p.estado === 'Activo');
    const normalizados = activos.map(normalizarDesdeProductos);
    cacheCatalogo = { data: normalizados, timestamp: Date.now() };
    return normalizados;
  } catch (err) {
    console.error('[Inventarios] Error total al conectar con API de Inventarios:', err);
    throw new Error('No se pudo conectar con el módulo de Inventarios. Verifique que la API esté en línea.');
  }
}

// ── Función pública de búsqueda ─────────────────────────────────────

export async function buscarProductos(
  termino: string,
  pagina: number = 1,
  limite: number = 10
): Promise<InventariosResponse> {
  const todos = await fetchProductos();

  const filtrados = termino
    ? todos.filter((p) =>
        p.nombre.toLowerCase().includes(termino.toLowerCase()) ||
        p.codigo.toLowerCase().includes(termino.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(termino.toLowerCase())
      )
    : todos;

  const total = filtrados.length;
  const totalPaginas = Math.ceil(total / limite);
  const inicio = (pagina - 1) * limite;
  const data = filtrados.slice(inicio, inicio + limite);

  return {
    success: true,
    data,
    total,
    pagina,
    totalPaginas,
  };
}
