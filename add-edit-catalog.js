const fs = require('fs');
let code = fs.readFileSync('src/components/CatalogoProveedorModal.tsx', 'utf8');

if(!code.includes('Edit2')) {
    code = code.replace("import { AlertTriangle, X } from 'lucide-react';", "import { AlertTriangle, X, Edit2, Check, X as XIcon } from 'lucide-react';");
}
if(!code.includes('import Tooltip from')) {
    code = code.replace('import ConfirmModal from "@/components/ConfirmModal";', 'import ConfirmModal from "@/components/ConfirmModal";\nimport Tooltip from "@/components/Tooltip";');
}

if(!code.includes('const [editingItem, setEditingItem] = useState<any>(null);')) {
    code = code.replace('const [precioInput, setPrecioInput] = useState<string>("");', 'const [precioInput, setPrecioInput] = useState<string>("");\n\n  // Estado para edición en línea\n  const [editingItem, setEditingItem] = useState<any>(null);\n  const [editPrecio, setEditPrecio] = useState<string>("");');
}

if(!code.includes('const handleEditarSubmit = async () => {')) {
    const handleEditarStr = `
  const handleEditarSubmit = async () => {
    if (!editingItem) return;
    const numPrecio = parseFloat(editPrecio) || 0;
    if (numPrecio <= 0) {
      mostrarAviso("El precio de compra debe ser mayor a 0", "warning");
      return;
    }

    try {
      await agregar({
        variables: {
          proveedorId,
          productoCodigo: editingItem.productoCodigo,
          precioCompra: numPrecio
        }
      });
      setEditingItem(null);
      setEditPrecio("");
      refetch();
      mostrarAviso("Producto actualizado correctamente", "success");
    } catch (e: any) {
      mostrarAviso("Error al actualizar: " + e.message, "warning");
    }
  };
`;
    code = code.replace('const confirmarAgregar = async () => {', handleEditarStr + '\n  const confirmarAgregar = async () => {');
}

const replacementHTML = `                      {editingItem?.id === item.id ? (
                        <td className="p-3 text-right">
                          <input 
                            type="number" 
                            step="0.01" 
                            className="w-24 px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none text-right"
                            value={editPrecio}
                            onChange={(e) => setEditPrecio(e.target.value)}
                            autoFocus
                          />
                        </td>
                      ) : (
                        <td className="p-3 text-right font-bold text-[#d20a11]">\${item.precioCompra.toFixed(2)}</td>
                      )}
                      
                      {canManage && (
                        <td className="p-3 text-center">
                          {editingItem?.id === item.id ? (
                            <div className="flex justify-center gap-2">
                              <Tooltip content="Guardar cambios" position="top">
                                <button 
                                  onClick={handleEditarSubmit}
                                  className="text-emerald-600 hover:text-emerald-800 p-1 bg-emerald-50 hover:bg-emerald-100 rounded transition"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              <Tooltip content="Cancelar edición" position="top">
                                <button 
                                  onClick={() => setEditingItem(null)}
                                  className="text-slate-500 hover:text-slate-700 p-1 bg-slate-100 hover:bg-slate-200 rounded transition"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <Tooltip content="Editar precio de compra" position="top">
                                <button 
                                  onClick={() => {
                                    setEditingItem(item);
                                    setEditPrecio(item.precioCompra.toString());
                                  }}
                                  className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 hover:bg-blue-100 rounded transition"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              <Tooltip content="Quitar producto del catálogo" position="top">
                                <button 
                                  onClick={() => handleEliminar(item.id)}
                                  className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded transition"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            </div>
                          )}
                        </td>
                      )}`;

code = code.replace(/<td className="p-3 text-right font-bold text-\[#d20a11\]">\$\{item\.precioCompra\.toFixed\(2\)\}<\/td>[\s\S]*?<\/td>\s*<\/div>\s*\)\}\s*<\/tr>/, replacementHTML + '\n                    </tr>'); // Wait, the regex might fail because it doesn't match the closing </tr>.

// Let's do a safer string replace:
const targetToReplace = `<td className="p-3 text-right font-bold text-[#d20a11]">\${item.precioCompra.toFixed(2)}</td>
                      {canManage && (
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => handleEliminar(item.id)}
                            className="text-red-500 hover:text-red-700 font-bold px-2 py-1 bg-red-50 hover:bg-red-100 rounded transition"
                            title="Quitar del catálogo"
                          >
                            Quitar
                          </button>
                        </td>
                      )}`;
code = code.replace(targetToReplace, replacementHTML);

fs.writeFileSync('src/components/CatalogoProveedorModal.tsx', code);
console.log('Script done.');
