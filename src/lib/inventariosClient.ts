export interface ProductoInventarioExterno {
  codigo: string;
  nombre: string;
  descripcion: string;
  stock_actual: number;
  pvp: string;
  graba_iva: boolean;
  porcentaje_iva_aplicado: number;
}

export interface ProductoInventarioNormalizado {
  codigo: string;
  nombre: string;
  descripcion: string;
  stockActual: number;
  precioUnitario: number;
  grabaIva: boolean;
  porcentajeIva: number;
}

export interface InventariosResponse {
  success: boolean;
  data: ProductoInventarioNormalizado[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

const INVENTARIOS_API_URL = process.env.INVENTARIOS_API_URL || '';

function normalizar(producto: ProductoInventarioExterno): ProductoInventarioNormalizado {
  return {
    codigo: producto.codigo,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    stockActual: producto.stock_actual,
    precioUnitario: parseFloat(producto.pvp) || 0,
    grabaIva: producto.graba_iva,
    porcentajeIva: producto.porcentaje_iva_aplicado,
  };
}

let cacheCatalogo: { data: ProductoInventarioNormalizado[]; timestamp: number } | null = null;
const CACHE_TTL = 60000;

async function fetchCatalogo(): Promise<ProductoInventarioNormalizado[]> {
  if (cacheCatalogo && Date.now() - cacheCatalogo.timestamp < CACHE_TTL) {
    return cacheCatalogo.data;
  }

  const url = `${INVENTARIOS_API_URL}/api/productos/catalogo`;

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Error al consultar Inventarios: ${res.status} ${res.statusText}`);
  }

  const body = await res.json();
  const externos: ProductoInventarioExterno[] = body.data ?? body ?? [];
  const normalizados = externos.map(normalizar);

  cacheCatalogo = { data: normalizados, timestamp: Date.now() };
  return normalizados;
}

export async function buscarProductos(
  termino: string,
  pagina: number = 1,
  limite: number = 10
): Promise<InventariosResponse> {
  const todos = await fetchCatalogo();

  const filtrados = termino
    ? todos.filter((p) =>
        p.nombre.toLowerCase().includes(termino.toLowerCase()) ||
        p.codigo.toLowerCase().includes(termino.toLowerCase())
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
