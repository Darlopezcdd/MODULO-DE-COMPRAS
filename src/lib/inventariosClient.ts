export interface ProductoInventarioExterno {
  id: number;
  codigo: string;
  nombre: string;
  stock_actual: number;
  precio_unitario: number;
  graba_iva: boolean;
  porcentaje_iva: number;
}

export interface ProductoInventarioNormalizado {
  id: number;
  codigo: string;
  nombre: string;
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
    id: producto.id,
    codigo: producto.codigo,
    nombre: producto.nombre,
    stockActual: producto.stock_actual,
    precioUnitario: producto.precio_unitario,
    grabaIva: producto.graba_iva,
    porcentajeIva: producto.porcentaje_iva,
  };
}

export async function buscarProductos(
  termino: string,
  pagina: number = 1,
  limite: number = 10
): Promise<InventariosResponse> {
  const params = new URLSearchParams();
  if (termino) params.set('termino', termino);
  params.set('pagina', String(pagina));
  params.set('limite', String(limite));

  const url = `${INVENTARIOS_API_URL}/productos?${params.toString()}`;

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Error al consultar Inventarios: ${res.status} ${res.statusText}`);
  }

  const body = await res.json();
  const externos: ProductoInventarioExterno[] = body.data ?? body ?? [];

  return {
    success: true,
    data: externos.map(normalizar),
    total: body.total ?? externos.length,
    pagina: body.pagina ?? pagina,
    totalPaginas: body.totalPaginas ?? Math.ceil((body.total ?? externos.length) / limite),
  };
}
