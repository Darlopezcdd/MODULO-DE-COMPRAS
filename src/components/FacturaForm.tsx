"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, ApolloProvider, useApolloClient } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apolloClient";
import { useRouter } from "next/navigation";
import AutocompleteProveedor from "./AutocompleteProveedor";
import { FacturaPdfPreview } from './FacturaPdfPreview';
import AutocompleteProducto from "./AutocompleteProducto";
import NuevoProductoModal from "./NuevoProductoModal";
import { useSearchParams } from "next/navigation";
import { Zap, Sparkles, Check, Plus, X, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import AlertBanner from "@/components/AlertBanner";
import Tooltip from "./Tooltip";
import ConfirmModal from "./ConfirmModal";

const LISTAR_CATALOGO = gql`
  query ListarCatalogo($proveedorId: Int!) {
    listarCatalogoProveedor(proveedorId: $proveedorId) {
      id
      productoCodigo
      precioCompra
    }
  }
`;

const AGREGAR_CATALOGO = gql`
  mutation AgregarAlCatalogo($proveedorId: Int!, $productoCodigo: String!, $precioCompra: Float!) {
    agregarAlCatalogo(proveedorId: $proveedorId, productoCodigo: $productoCodigo, precioCompra: $precioCompra) {
      id
      precioCompra
      productoCodigo
    }
  }
`;

const MEJOR_PROVEEDOR = gql`
  query MejorProveedor($productoCodigo: String!) {
    mejorProveedor(productoCodigo: $productoCodigo) {
      proveedor {
        id
        cedulaRuc
        nombre
        direccion
        telefono
        tipo
      }
      precioCompra
    }
  }
`;

const LISTAR_PROVEEDORES = gql`
  query ListarProveedores($buscar: String) {
    listarProveedores(buscar: $buscar, estado: ACTIVO) {
      id
      cedulaRuc
      nombre
      direccion
      telefono
      tipo
    }
  }
`;

export default function FacturaForm() {
  return (
    <ApolloProvider client={apolloClient}>
      <FacturaFormContent />
    </ApolloProvider>
  );
}

interface ProveedorSeleccionado {
  id?: number;
  cedulaRuc?: string;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  tipo?: 'CONTADO' | 'CREDITO';
}

function FacturaFormContent() {
  const searchParams = useSearchParams();
  const productoQuery = searchParams.get("producto");
  const apollo = useApolloClient();

  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorSeleccionado | null>(null);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [facturaGenerada, setFacturaGenerada] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingExcelProducts, setPendingExcelProducts] = useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };
  const [tipoPago, setTipoPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  // Nuevos estados para pagos
  const [cuentasEmpresa, setCuentasEmpresa] = useState<any[]>([]);
  const [cuentaBancariaId, setCuentaBancariaId] = useState('');
  const [numeroCuotas, setNumeroCuotas] = useState(1);
  const [diasPorCuota, setDiasPorCuota] = useState(30);

  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: catalogData, refetch: refetchCatalog } = useQuery<any>(LISTAR_CATALOGO, {
    variables: { proveedorId: selectedProveedor?.id },
    skip: !selectedProveedor?.id,
    fetchPolicy: "network-only",
  });

  const [agregarAlCatalogo] = useMutation(AGREGAR_CATALOGO);

  const catalogoMap = new Map<string, number>(
    catalogData?.listarCatalogoProveedor?.map((c: any) => [c.productoCodigo, Number(c.precioCompra)]) || []
  );

  const [catalogoRapido, setCatalogoRapido] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetalles = async () => {
      const items = catalogData?.listarCatalogoProveedor || [];
      if (items.length === 0) {
        setCatalogoRapido([]);
        return;
      }
      const codigos = items.map((i: any) => i.productoCodigo).join(",");
      try {
        const res = await fetch(`/api/inventarios?limite=200&codigos=${codigos}`);
        const result = await res.json();
        if (result.success) {
          const combinados = items.map((cat: any) => {
            const globalInfo = result.data.find((p: any) => p.codigo === cat.productoCodigo);
            return {
              ...cat,
              nombre: globalInfo?.nombre || "Producto desconocido",
              grabaIva: globalInfo?.grabaIva ?? true,
              porcentajeIva: globalInfo?.porcentajeIva ?? 15,
            };
          });
          setCatalogoRapido(combinados);
        }
      } catch (e) {
        console.error("Error al obtener catálogo rápido", e);
      }
    };
    if (catalogData) {
      fetchDetalles();
    }
  }, [catalogData]);

  // Cargar cuentas bancarias
  useEffect(() => {
    const fetchCuentas = async () => {
      try {
        const res = await fetch('/api/cuentas');
        const data = await res.json();
        if (data.success && data.data) {
          setCuentasEmpresa(data.data);
          if (data.data.length > 0) {
            setCuentaBancariaId(data.data[0].id);
          }
        }
      } catch (e) {
        console.error("Error al obtener cuentas bancarias", e);
      }
    };
    fetchCuentas();
  }, []);

  const [productos, setProductos] = useState([
    { codigo: "", descripcion: "", cantidad: 1, pvp: 0, grabaIva: true, porcentajeIva: 15 }
  ]);

  // Auto-selección desde el dashboard
  useEffect(() => {
    if (productoQuery && !selectedProveedor) {
      const autoSelect = async () => {
        try {
          // 1. Obtener detalles del producto de la API de inventarios
          const res = await fetch(`/api/inventarios?limite=1&termino=${productoQuery}`);
          const result = await res.json();
          const productoGlobal = result.data?.find((p: any) => p.codigo === productoQuery);

          if (!productoGlobal) return;

          // 2. Buscar el mejor proveedor en GraphQL
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await apollo.query<any>({
            query: MEJOR_PROVEEDOR,
            variables: { productoCodigo: productoQuery },
          });

          if (data?.mejorProveedor) {
            setSelectedProveedor(data.mejorProveedor.proveedor);
            if (data.mejorProveedor.proveedor.tipo) {
              setTipoPago(data.mejorProveedor.proveedor.tipo);
            }
            setProductos([{
              codigo: productoGlobal.codigo,
              descripcion: productoGlobal.nombre,
              cantidad: 1,
              pvp: data.mejorProveedor.precioCompra,
              grabaIva: productoGlobal.grabaIva,
              porcentajeIva: productoGlobal.porcentajeIva,
            }]);
          } else {
            // Si no hay proveedor en catálogo, solo pre-llenar el producto
            setProductos([{
              codigo: productoGlobal.codigo,
              descripcion: productoGlobal.nombre,
              cantidad: 1,
              pvp: productoGlobal.precioUnitario,
              grabaIva: productoGlobal.grabaIva,
              porcentajeIva: productoGlobal.porcentajeIva,
            }]);
          }
        } catch (e) {
          console.error("Error auto-seleccionando", e);
        }
      };
      autoSelect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoQuery, apollo]);

  const handleAddProduct = () => {
    setProductos([...productos, { codigo: "", descripcion: "", cantidad: 1, pvp: 0, grabaIva: true, porcentajeIva: 15 }]);
  };

  const handleRemoveProduct = (index: number) => {
    setProductos(productos.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: string, value: string | number | boolean) => {
    setProductos(prev => {
      const newProductos = [...prev];
      newProductos[index] = { ...newProductos[index], [field]: value };
      return newProductos;
    });
  };

  const descargarPlantillaExcel = () => {
    const aoa = [
      ["primero poner el proveedor, luego a partir de la fila 5 colocar el producto, la cantidad, el pvp y si graba iva o no"],
      ["RUC Proveedor"],
      ["1004384226"],
      ["Código", "Cantidad", "PVP", "Graba IVA (SI/NO)"],
      ["PROD-001", 10, 4.50, "SI"],
      ["PROD-002", 5, 12.00, "NO"]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
    worksheet["!cols"] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 }
    ];
    XLSX.writeFile(workbook, "Plantilla_Importar_Detalle_Factura.xlsx");
  };

  const handleImportarExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      const aoa: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      let rucExcel = "";
      let headerRowIndex = 0;

      for (let i = 0; i < Math.min(aoa.length, 10); i++) {
        const row = aoa[i];
        if (!row || row.length === 0) continue;

        const firstCell = String(row[0] || "").trim().toUpperCase();
        const secondCell = String(row[1] || "").trim().toUpperCase();

        if (firstCell === "RUC PROVEEDOR" || firstCell === "RUC") {
          rucExcel = String(aoa[i + 1]?.[0] || "").trim();
        }

        if (firstCell === "CÓDIGO" || firstCell === "CODIGO" || firstCell === "CODE" || secondCell === "CANTIDAD" || secondCell === "QTY") {
          headerRowIndex = i;
          break;
        }
      }

      const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { range: headerRowIndex });

      if (rows.length === 0) {
        alert("El archivo Excel está vacío.");
        return;
      }

      const importados: any[] = [];
      for (const row of rows) {
        const codigo = String(row.Código || row.codigo || row.Codigo || "").trim();
        const cantidad = parseFloat(String(row.Cantidad || row.cantidad || "1"));
        const pvpVal = row.PVP || row.pvp || row.Precio || row.precio;
        const pvp = pvpVal !== undefined && pvpVal !== null && pvpVal !== "" ? parseFloat(String(pvpVal).replace(",", ".")) : 0;
        const grabaIvaStr = String(row["Graba IVA (SI/NO)"] || row["Graba Iva"] || row.grabaIva || row.graba_iva || "SI").trim().toUpperCase();
        const grabaIva = grabaIvaStr === "SI" || grabaIvaStr === "YES" || grabaIvaStr === "TRUE" || grabaIvaStr === "1";

        if (codigo && !isNaN(cantidad) && cantidad > 0 && !isNaN(pvp) && pvp >= 0) {
          importados.push({
            codigo,
            cantidad,
            pvp,
            grabaIva,
          });
        }
      }

      if (importados.length === 0) {
        alert("No se encontraron registros válidos en el archivo Excel. Asegúrate de usar las cabeceras: Código, Cantidad, PVP, Graba IVA (SI/NO)");
        return;
      }

      // Intentar auto-seleccionar leyendo el RUC encontrado en el Excel
      let autoProveedor = selectedProveedor;

      if (rucExcel) {
        try {
          const { data: provData } = await apollo.query<any>({
            query: LISTAR_PROVEEDORES,
            variables: { buscar: rucExcel },
          });
          const proveedorEncontrado = provData?.listarProveedores?.find((p: any) => p.cedulaRuc === rucExcel);
          if (proveedorEncontrado) {
            autoProveedor = proveedorEncontrado;
            setSelectedProveedor(autoProveedor);
            if (autoProveedor?.tipo) {
              setTipoPago(autoProveedor.tipo);
            }
            showNotification(`Se seleccionó automáticamente el proveedor ${autoProveedor?.nombre} leyendo el RUC del Excel.`, "success");
          }
        } catch (e) {
          console.error("Error buscando proveedor por RUC del Excel", e);
        }
      }

      // Si no se encontró el proveedor por el Excel, usar el mejor proveedor del primer producto
      if (!autoProveedor && importados.length > 0) {
        try {
          const { data: bestProvData } = await apollo.query<any>({
            query: MEJOR_PROVEEDOR,
            variables: { productoCodigo: importados[0].codigo },
          });
          if (bestProvData?.mejorProveedor?.proveedor) {
            autoProveedor = bestProvData.mejorProveedor.proveedor;
            setSelectedProveedor(autoProveedor);
            if (autoProveedor?.tipo) {
              setTipoPago(autoProveedor.tipo);
            }
            showNotification(`Se seleccionó automáticamente el proveedor ${autoProveedor?.nombre} para los productos importados.`, "success");
          }
        } catch (e) {
          console.error("Error auto-seleccionando proveedor en importación", e);
        }
      }

      let activeProveedorId = autoProveedor?.id;
      let activeCatalogoMap = new Map<string, number>();

      if (activeProveedorId) {
        try {
          const { data: catRes } = await apollo.query<any>({
            query: LISTAR_CATALOGO,
            variables: { proveedorId: activeProveedorId },
            fetchPolicy: "network-only",
          });
          if (catRes?.listarCatalogoProveedor) {
            catRes.listarCatalogoProveedor.forEach((c: any) => {
              activeCatalogoMap.set(c.productoCodigo, Number(c.precioCompra));
            });
          }
        } catch (e) {
          console.error("Error cargando catálogo del proveedor para importación", e);
        }
      }

      const codigosList = importados.map(p => p.codigo).join(",");
      const res = await fetch(`/api/inventarios?limite=200&codigos=${codigosList}`);
      const result = await res.json();
      const globalProducts = result.success ? result.data : [];

      const productosValidados = importados.map(imp => {
        const pInv = globalProducts.find((p: any) => p.codigo === imp.codigo);

        let precioFinal = imp.pvp;
        if (activeCatalogoMap.has(imp.codigo)) {
          precioFinal = activeCatalogoMap.get(imp.codigo) || 0;
        } else if (precioFinal === 0 && pInv) {
          precioFinal = pInv.precioUnitario || 0;
        }

        return {
          codigo: imp.codigo,
          descripcion: pInv ? pInv.nombre : "Producto no registrado en Inventario",
          cantidad: imp.cantidad,
          pvp: precioFinal,
          grabaIva: pInv ? pInv.grabaIva : imp.grabaIva,
          porcentajeIva: pInv ? pInv.porcentajeIva : 15
        };
      });

      setPendingExcelProducts(productosValidados);
      setShowConfirmModal(true);
      // La confirmación y notificación se manejarán en los callbacks del ConfirmModal
    } catch (err) {
      console.error(err);
      alert("Error al procesar archivo Excel. Verifica el formato.");
    } finally {
      setIsImportingExcel(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const roundToTwo = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;


  const totales = {
    subtotalSinIva: 0,
    subtotalConIva: 0,
    totalIva: 0,
    total: 0,
  };

  productos.forEach((prod) => {
    const sub = roundToTwo(prod.cantidad * prod.pvp);
    if (prod.grabaIva) {
      totales.subtotalConIva += sub;
      totales.totalIva += roundToTwo(sub * (prod.porcentajeIva / 100));
    } else {
      totales.subtotalSinIva += sub;
    }
  });

  totales.total = totales.subtotalSinIva + totales.subtotalConIva + totales.totalIva;

  const handleSaveFactura = async () => {
    if (!selectedProveedor?.id) {
      alert("Por favor seleccione un proveedor primero.");
      return;
    }

    const validProductos = productos.filter(p => p.codigo && p.cantidad > 0 && p.pvp >= 0);
    if (validProductos.length === 0) {
      const escritosSinSeleccionar = productos.some(p => !p.codigo && p.descripcion.trim().length > 0);
      alert(
        escritosSinSeleccionar
          ? "Hay filas con texto escrito pero sin producto seleccionado. Seleccione el producto desde la lista de sugerencias o desde el catálogo rápido."
          : "Agregue al menos un producto válido a la factura."
      );
      return;
    }

    const filasIncompletas = productos.filter(p => !p.codigo && p.descripcion.trim().length > 0);
    if (filasIncompletas.length > 0) {
      const seguir = confirm(
        `Hay ${filasIncompletas.length} fila(s) con texto sin producto seleccionado que NO se incluirán en la factura. ¿Desea continuar solo con los productos válidos?`
      );
      if (!seguir) return;
    }

    if (tipoPago === 'CREDITO' && !fechaVencimiento) {
      alert("La fecha de vencimiento inicial es obligatoria para compras a crédito.");
      return;
    }

    if (tipoPago === 'CONTADO' && !cuentaBancariaId) {
      alert("Seleccione una cuenta bancaria origen para el débito al contado.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedorId: selectedProveedor.id,
          tipoPago,
          fechaVencimiento,
          productos: validProductos,
          cuentaBancariaId: tipoPago === 'CONTADO' ? cuentaBancariaId : undefined,
          numeroCuotas: tipoPago === 'CREDITO' ? numeroCuotas : 1,
          diasPorCuota: tipoPago === 'CREDITO' ? diasPorCuota : 30
        })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error al guardar factura');

      setFacturaGenerada(body.factura);
      setSaveSuccess(true);

      // Redirigir a la lista de facturas después de 3 segundos
      setTimeout(() => {
        router.push(`/facturas?preview=${body.factura.id}`);
      }, 3000);

    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (saveSuccess) {
    return (
      <div className="p-12 bg-white rounded-xl shadow-lg border border-emerald-200 mt-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Factura Generada Exitosamente!</h2>
        <p className="text-slate-500 mb-8 max-w-md">
          La factura <strong className="text-emerald-600">{facturaGenerada?.numero_factura || `FC-${facturaGenerada?.id?.toString().padStart(8, '0')}`}</strong> ha sido guardada y procesada correctamente en el sistema.
        </p>
        <div className="flex gap-4">
          <Tooltip content="Ver la lista completa de facturas registradas" position="top">
            <button
              onClick={() => router.push('/facturas')}

              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
            >
              Ver lista de facturas
            </button>
          </Tooltip>
          <Tooltip content="Limpiar formulario para crear una nueva factura" position="top">
            <button
              onClick={() => {
                setSaveSuccess(false);
                setFacturaGenerada(null);
                setSelectedProveedor(null);
                setProductos([{ codigo: "", descripcion: "", cantidad: 1, pvp: 0, grabaIva: true, porcentajeIva: 15 }]);
                setTipoPago('CONTADO');
                setFechaVencimiento('');
              }}

              className="px-6 py-2 bg-[#d20a11] hover:bg-[#b0080e] text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              Crear otra factura
            </button>
          </Tooltip>
        </div>
        <p className="text-sm text-slate-400 mt-8 animate-pulse">Redirigiendo automáticamente en 3 segundos...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 mb-8 mt-6">
      <h2 className="text-2xl font-semibold mb-6 text-slate-900 border-b border-slate-200 pb-4">
        Cabecera de Factura
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AutocompleteProveedor
          onSelect={(prov) => {
            setSelectedProveedor(prov);
            if (prov.tipo) {
              setTipoPago(prov.tipo);
            }
          }}
          value={selectedProveedor?.nombre || ''}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cédula / RUC</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 outline-none"
            readOnly
            value={selectedProveedor?.cedulaRuc || ""}
          />
        </div>

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 outline-none"
              readOnly
              value={selectedProveedor?.direccion || ""}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Pago</label>
            <select
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#d20a11] outline-none"
              value={tipoPago}
              onChange={(e) => setTipoPago(e.target.value as 'CONTADO' | 'CREDITO')}
            >
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Crédito</option>
            </select>
          </div>
        </div>

        {tipoPago === 'CONTADO' && (
          <div className="md:col-span-2 mt-2 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <label className="block text-sm font-medium text-emerald-800 mb-2">
              <Zap className="w-4 h-4 inline mr-1" />
              Cuenta Origen (Para Débito Inmediato)
            </label>
            <select
              className="w-full md:w-1/2 px-4 py-2 border border-emerald-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={cuentaBancariaId}
              onChange={(e) => setCuentaBancariaId(e.target.value)}
            >
              {cuentasEmpresa.map(c => (
                <option key={c.id} value={c.id}>{c.banco} - {c.tipoCuenta} ({c.numeroCuenta}) - Saldo: ${c.saldo}</option>
              ))}
            </select>
            <p className="text-xs text-emerald-600 mt-2">
              Al guardar, el total de la factura se descontará automáticamente de esta cuenta.
            </p>
          </div>
        )}

        {tipoPago === 'CREDITO' && (
          <div className="md:col-span-2 mt-2 p-4 bg-blue-50 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha 1er Vencimiento <span className="text-red-500">*</span></label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#d20a11] outline-none"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                required
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Número de Cuotas</label>
              <input
                type="number"
                min="1"
                max="36"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#d20a11] outline-none"
                value={numeroCuotas}
                onChange={(e) => setNumeroCuotas(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Días por Cuota</label>
              <select
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#d20a11] outline-none"
                value={diasPorCuota}
                onChange={(e) => setDiasPorCuota(parseInt(e.target.value) || 30)}
              >
                <option value={15}>Quincenal (15 días)</option>
                <option value={30}>Mensual (30 días)</option>
                <option value={60}>Bimestral (60 días)</option>
                <option value={90}>Trimestral (90 días)</option>
              </select>
            </div>
            {numeroCuotas > 1 && (
              <p className="col-span-full text-xs text-blue-600">
                Se generarán {numeroCuotas} cuentas por pagar separadas, con vencimiento cada {diasPorCuota} días empezando desde el {fechaVencimiento || '...'}.
              </p>
            )}
          </div>
        )}
      </div>

      {catalogoRapido.length > 0 && (
        <div className="mt-6 border border-[#d20a11]/20 bg-[#d20a11]/5 p-4 rounded-xl">
          <h4 className="text-sm font-semibold text-[#d20a11] mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#d20a11]" fill="currentColor" /> Acceso Rápido: Catálogo del Proveedor
          </h4>
          <div className="flex flex-wrap gap-2">
            {catalogoRapido.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setProductos(prev => {
                    const existingIndex = prev.findIndex(p => p.codigo === item.productoCodigo);

                    if (existingIndex >= 0) {
                      const next = [...prev];
                      next[existingIndex] = { ...next[existingIndex], cantidad: next[existingIndex].cantidad + 1 };
                      return next;
                    }

                    const nuevaFila = {
                      codigo: item.productoCodigo,
                      descripcion: item.nombre,
                      cantidad: 1,
                      pvp: Number(item.precioCompra) || 0,
                      grabaIva: item.grabaIva ?? true,
                      porcentajeIva: item.porcentajeIva ?? 15,
                    };

                    const lastRowIndex = prev.length - 1;
                    if (lastRowIndex >= 0 && !prev[lastRowIndex].codigo) {
                      const next = [...prev];
                      next[lastRowIndex] = { ...next[lastRowIndex], ...nuevaFila, cantidad: 1 };
                      return next;
                    }
                    return [...prev, nuevaFila];
                  });
                }}
                className="flex flex-col items-start bg-white border border-[#d20a11]/30 hover:border-[#d20a11] hover:shadow-md px-3 py-2 rounded-lg transition-all text-left min-w-[140px] max-w-[200px]"
              >
                <span className="text-xs font-mono text-slate-500 mb-0.5">{item.productoCodigo}</span>
                <span className="text-sm font-medium text-slate-900 truncate w-full">{item.nombre}</span>
                <span className="text-sm font-bold text-[#d20a11] mt-1">${Number(item.precioCompra).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-slate-900">Detalle de Productos</h3>
          <div className="flex gap-2 items-center">
            {/* Descargar Plantilla */}
            <Tooltip content="Descargar plantilla de Excel para importar productos" position="top">
              <button
                type="button"
                onClick={descargarPlantillaExcel}

                className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium border border-slate-200 flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-500" /> Plantilla Excel
              </button>
            </Tooltip>

            {/* Cargar Excel */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx, .xls, .csv"
              onChange={handleImportarExcel}
            />
            <Tooltip content="Cargar productos desde un archivo Excel" position="top">
              <button
                type="button"
                disabled={isImportingExcel}
                onClick={() => fileInputRef.current?.click()}

                className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors text-sm font-medium border border-emerald-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isImportingExcel ? (
                  <>
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Cargar Excel
                  </>
                )}

              </button>
            </Tooltip>

            {selectedProveedor?.id && (
              <Tooltip content="Registrar un nuevo producto en el catálogo" position="top">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(true)}

                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Crear Producto Nuevo
                </button>
              </Tooltip>
            )}
            <Tooltip content="Agregar una nueva fila de producto" position="top">
              <button
                type="button"
                data-testid="add-product-btn"
                onClick={handleAddProduct}

                className="px-4 py-2 bg-[#d20a11] text-white rounded-lg hover:bg-[#b0080e] transition-colors text-sm font-medium shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Agregar Fila
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm">
                <th className="p-3 border-b border-slate-200">Descripción</th>
                <th className="p-3 border-b border-slate-200 w-24">Cantidad</th>
                <th className="p-3 border-b border-slate-200 w-32">PVP</th>
                <th className="p-3 border-b border-slate-200 w-24 text-center">Graba IVA</th>
                <th className="p-3 border-b border-slate-200 w-32 text-right">Total</th>
                <th className="p-3 border-b border-slate-200 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {productos.map((prod, index) => {
                const subtotal = roundToTwo(prod.cantidad * prod.pvp);
                const isNew = prod.codigo && !catalogoMap.has(prod.codigo) && selectedProveedor?.id;

                return (
                  <tr key={index} data-testid={`product-row-${index}`} className={`border-b text-sm transition-colors ${isNew ? 'bg-amber-50 border-amber-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <td className="p-3">
                      <AutocompleteProducto
                        value={prod.codigo ? `${prod.codigo} - ${prod.descripcion}` : ""}
                        onManualChange={(texto) => {
                          // Si el usuario edita el texto a mano, la fila deja de estar vinculada
                          // a un producto del inventario hasta que seleccione uno del listado.
                          setProductos(prev => {
                            const next = [...prev];
                            next[index] = { ...next[index], codigo: "", descripcion: texto };
                            return next;
                          });
                        }}
                        onSelect={async (p) => {
                          updateProduct(index, "codigo", p.codigo);
                          updateProduct(index, "descripcion", p.nombre);
                          updateProduct(index, "grabaIva", p.grabaIva);
                          updateProduct(index, "porcentajeIva", p.porcentajeIva);

                          let pvp = p.precioUnitario || 0;

                          const enCatalogoActual = selectedProveedor && catalogoMap.has(p.codigo);

                          if (!selectedProveedor || !enCatalogoActual) {
                            try {
                              const { data: bestProvData } = await apollo.query<any>({
                                query: MEJOR_PROVEEDOR,
                                variables: { productoCodigo: p.codigo },
                              });
                              if (bestProvData?.mejorProveedor?.proveedor) {
                                const prov = bestProvData.mejorProveedor.proveedor;
                                setSelectedProveedor(prov);
                                pvp = bestProvData?.mejorProveedor?.precioCompra || pvp;
                                showNotification(`Se seleccionó automáticamente el proveedor ${prov.nombre} que ofrece este producto.`, "success");
                              } else {
                                if (enCatalogoActual) {
                                  pvp = catalogoMap.get(p.codigo) || 0;
                                }
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          } else {
                            pvp = catalogoMap.get(p.codigo) || 0;
                          }

                          updateProduct(index, "pvp", pvp);
                        }}
                      />
                      {prod.codigo && !catalogoMap.has(prod.codigo) && selectedProveedor?.id && (
                        <div className="mt-1 text-xs text-amber-600 flex items-center gap-2">
                          <span>⚠️ Nuevo para proveedor</span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await agregarAlCatalogo({
                                  variables: {
                                    proveedorId: selectedProveedor.id,
                                    productoCodigo: prod.codigo,
                                    precioCompra: prod.pvp
                                  }
                                });
                                await refetchCatalog();
                                showNotification("Agregado al catálogo del proveedor con éxito", "success");
                              } catch (e: any) {
                                showNotification("Error al agregar: " + e.message, "error");
                              }
                            }}
                            className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded hover:bg-amber-200 transition"
                          >
                            Añadir al catálogo (con precio actual)
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        data-testid={`qty-${index}`}
                        className="w-full px-2 py-1 bg-white border border-slate-300 text-slate-900 rounded outline-none focus:border-[#d20a11] focus:ring-1 focus:ring-[#d20a11] transition-colors"
                        min="1"
                        value={prod.cantidad}
                        onChange={(e) => updateProduct(index, "cantidad", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        data-testid={`pvp-${index}`}
                        className="w-full px-2 py-1 bg-white border border-slate-300 text-slate-900 rounded outline-none focus:border-[#d20a11] focus:ring-1 focus:ring-[#d20a11] transition-colors"
                        min="0"
                        step="0.01"
                        value={prod.pvp}
                        onChange={(e) => updateProduct(index, "pvp", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        data-testid={`iva-${index}`}
                        checked={prod.grabaIva}
                        onChange={(e) => updateProduct(index, "grabaIva", e.target.checked)}
                        className="accent-[#d20a11]"
                      />
                    </td>
                    <td className="p-3 text-right font-medium text-slate-700">
                      ${subtotal.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <Tooltip content="Eliminar esta fila de producto" position="left">
                        <button
                          type="button"
                          data-testid={`remove-${index}`}
                          onClick={() => handleRemoveProduct(index)}

                          className="text-red-400 hover:text-red-600 p-1 rounded-md transition-colors"
                        >
                          <X size={18} strokeWidth={2.5} />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-64 bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-slate-500">Subtotal (Sin IVA):</span>
              <span data-testid="subtotal-sin-iva" className="font-medium text-slate-900">${totales.subtotalSinIva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-slate-500">Subtotal (Con IVA):</span>
              <span data-testid="subtotal-con-iva" className="font-medium text-slate-900">${totales.subtotalConIva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-slate-500">IVA (15%):</span>
              <span data-testid="total-iva" className="font-medium text-slate-900">${totales.totalIva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-slate-300 text-lg font-bold text-slate-900">
              <span>Total:</span>
              <span data-testid="total-general" className="text-[#d20a11]">${totales.total.toFixed(2)}</span>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <Tooltip content="Guardar y procesar esta factura en el sistema" position="top">
                <button
                  type="button"
                  onClick={handleSaveFactura}
                  disabled={isSaving}

                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-300 shadow-sm flex items-center justify-center gap-2"
                >
                  {isSaving ? "Guardando..." : (
                    <>
                      <Check className="w-5 h-5" /> Guardar Factura
                    </>
                  )}

                </button>
              </Tooltip>

              <FacturaPdfPreview
                data={{
                  numeroFactura: "Borrador",
                  proveedorNombre: selectedProveedor?.nombre || "Desconocido",
                  proveedorRuc: selectedProveedor?.cedulaRuc || "N/A",
                  tipoPago: tipoPago,
                  fechaVencimiento: fechaVencimiento || "N/A",
                  items: productos.filter(p => p.codigo || p.descripcion.trim()).map(p => ({
                    descripcion: p.descripcion,
                    aplicaIva: p.grabaIva,
                    precioUnitario: p.pvp,
                    cantidad: p.cantidad
                  })),
                  subtotalSinIva: totales.subtotalSinIva,
                  subtotalConIva: totales.subtotalConIva,
                  montoIva: totales.totalIva,
                  total: totales.total
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {showNewProductModal && selectedProveedor?.id && (
        <NuevoProductoModal
          proveedorId={selectedProveedor.id}
          onClose={() => setShowNewProductModal(false)}
          onSuccess={async (codigo, nombre, precioCompra) => {
            setShowNewProductModal(false);
            await refetchCatalog();

            // Auto agregar el producto a una nueva fila o a la última vacía
            setProductos(prev => {
              const nuevaFila = { codigo, descripcion: nombre, cantidad: 1, pvp: precioCompra, grabaIva: true, porcentajeIva: 15 };
              const lastRowIndex = prev.length - 1;
              if (lastRowIndex >= 0 && !prev[lastRowIndex].codigo) {
                const next = [...prev];
                next[lastRowIndex] = { ...next[lastRowIndex], ...nuevaFila };
                return next;
              }
              return [...prev, nuevaFila];
            });
          }}
        />
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 w-96 max-w-[90vw]">
          <AlertBanner
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
            autoCloseMs={4000}
            className="shadow-xl border-l-4"
          />
        </div>
      )}

      {/* Modal de Confirmación de Excel */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Importar productos del Excel"
        message={`Se leyeron ${pendingExcelProducts.length} productos válidos del archivo Excel.\n\n¿Deseas REEMPLAZAR el detalle actual de la factura con estos productos?`}
        confirmText="Reemplazar Actual"
        cancelText="Añadir al Final"
        type="info"
        onConfirm={() => {
          setProductos(pendingExcelProducts);
          setShowConfirmModal(false);
          showNotification(`Se importaron ${pendingExcelProducts.length} productos con éxito`, "success");
        }}
        onCancel={() => {
          const prevFilas = productos.filter(p => p.codigo !== "");
          setProductos([...prevFilas, ...pendingExcelProducts]);
          setShowConfirmModal(false);
          showNotification(`Se añadieron ${pendingExcelProducts.length} productos con éxito`, "success");
        }}
      />
    </div>
  );
}
