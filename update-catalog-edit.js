const fs = require('fs');
let code = fs.readFileSync('src/components/CatalogoProveedorModal.tsx', 'utf8');

if(!code.includes('const [editCodigo, setEditCodigo] = useState<string>("");')) {
    code = code.replace(
        'const [editPrecio, setEditPrecio] = useState<string>("");', 
        'const [editPrecio, setEditPrecio] = useState<string>("");\n  const [editCodigo, setEditCodigo] = useState<string>("");'
    );
}

const handleEditarSubmitReplacement = `
  const handleEditarSubmit = async () => {
    if (!editingItem) return;
    const numPrecio = parseFloat(editPrecio) || 0;
    if (numPrecio <= 0) {
      mostrarAviso("El precio de compra debe ser mayor a 0", "warning");
      return;
    }

    try {
      if (editingItem.productoCodigo !== editCodigo) {
        // Si el codigo cambió, eliminamos el registro anterior
        await eliminar({ variables: { id: editingItem.id } });
      }

      await agregar({
        variables: {
          proveedorId,
          productoCodigo: editCodigo,
          precioCompra: numPrecio
        }
      });
      setEditingItem(null);
      setEditPrecio("");
      setEditCodigo("");
      refetch();
      mostrarAviso("Producto actualizado correctamente", "success");
    } catch (e: any) {
      mostrarAviso("Error al actualizar: " + e.message, "warning");
    }
  };
`;

code = code.replace(/const handleEditarSubmit = async \(\) => \{[\s\S]*?catch \(e: any\) \{[\s\S]*?\}\s*\};\s*const confirmarAgregar = async \(\) => \{/, handleEditarSubmitReplacement + '\n  const confirmarAgregar = async () => {');

const tableRowReplacement = `                      {editingItem?.id === item.id ? (
                        <td colSpan={2} className="p-2 relative z-[9999]">
                           <AutocompleteProducto 
                             value={\`\${editCodigo} - \${item.nombre}\`}
                             onSelect={(prod) => {
                               setEditCodigo(prod.codigo);
                             }}
                             onManualChange={() => {}}
                           />
                        </td>
                      ) : (
                        <>
                          <td className="p-3 font-mono text-slate-500">{item.productoCodigo}</td>
                          <td className="p-3 font-medium text-slate-900">{item.nombre}</td>
                        </>
                      )}
                      <td className="p-3 text-slate-600">{item.stockActual}</td>
                      {editingItem?.id === item.id ? (`;

const targetToReplace = `                      <td className="p-3 font-mono text-slate-500">{item.productoCodigo}</td>
                      <td className="p-3 font-medium text-slate-900">{item.nombre}</td>
                      <td className="p-3 text-slate-600">{item.stockActual}</td>
                      {editingItem?.id === item.id ? (`;

code = code.replace(targetToReplace, tableRowReplacement);

// We need to also update the `Edit2` click handler to setEditCodigo
const editButtonReplace = `onClick={() => {
                                    setEditingItem(item);
                                    setEditPrecio(item.precioCompra.toString());
                                    setEditCodigo(item.productoCodigo);
                                  }}`;
const editButtonTarget = `onClick={() => {
                                    setEditingItem(item);
                                    setEditPrecio(item.precioCompra.toString());
                                  }}`;

code = code.replace(editButtonTarget, editButtonReplace);

fs.writeFileSync('src/components/CatalogoProveedorModal.tsx', code);
console.log('Done script');
