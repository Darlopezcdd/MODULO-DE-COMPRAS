const fs = require('fs');

let content = fs.readFileSync('src/components/FacturaForm.tsx', 'utf-8');

if(!content.includes("import Tooltip from")) {
    content = content.replace('import AlertBanner from "@/components/AlertBanner";', 'import AlertBanner from "@/components/AlertBanner";\nimport Tooltip from "./Tooltip";');
}

// 1. Descargar plantilla
content = content.replace(
    /<button\s+type="button"\s+onClick=\{descargarPlantillaExcel\}\s+title="Descargar plantilla de Excel para importar productos"(.*?)>\s*<FileSpreadsheet(.*?)\/> Plantilla Excel\s*<\/button>/gs,
    `<Tooltip content="Descargar plantilla de Excel para importar productos" position="top">
              <button
                type="button"
                onClick={descargarPlantillaExcel}
                $1>
                <FileSpreadsheet$2/> Plantilla Excel
              </button>
            </Tooltip>`
);

// 2. Cargar Excel
content = content.replace(
    /<button\s+type="button"\s+disabled=\{isImportingExcel\}\s+onClick=\{\(\) => fileInputRef.current\?\.click\(\)\}\s+title="Cargar productos desde un archivo Excel"(.*?)>\s*([\s\S]*?)<\/button>/gs,
    `<Tooltip content="Cargar productos desde un archivo Excel" position="top">
              <button
                type="button"
                disabled={isImportingExcel}
                onClick={() => fileInputRef.current?.click()}
                $1>
                $2
              </button>
            </Tooltip>`
);

// 3. Crear Producto Nuevo
content = content.replace(
    /<button\s+type="button"\s+onClick=\{\(\) => setShowNewProductModal\(true\)\}\s+title="Registrar un nuevo producto en el catálogo"(.*?)>\s*<Sparkles(.*?)\/> Crear Producto Nuevo\s*<\/button>/gs,
    `<Tooltip content="Registrar un nuevo producto en el catálogo" position="top">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(true)}
                  $1>
                  <Sparkles$2/> Crear Producto Nuevo
                </button>
              </Tooltip>`
);

// 4. Agregar Fila
content = content.replace(
    /<button\s+type="button"\s+data-testid="add-product-btn"\s+onClick=\{handleAddProduct\}\s+title="Agregar una nueva fila de producto"(.*?)>\s*<Plus(.*?)\/> Agregar Fila\s*<\/button>/gs,
    `<Tooltip content="Agregar una nueva fila de producto" position="top">
              <button
                type="button"
                data-testid="add-product-btn"
                onClick={handleAddProduct}
                $1>
                <Plus$2/> Agregar Fila
              </button>
            </Tooltip>`
);

// 5. Eliminar fila
content = content.replace(
    /<button\s+type="button"\s+data-testid=\{\`remove-\$\{index\}\`\}\s+onClick=\{\(\) => handleRemoveProduct\(index\)\}\s+title="Eliminar esta fila de producto"(.*?)>\s*<X(.*?)\/>\s*<\/button>/gs,
    `<Tooltip content="Eliminar esta fila de producto" position="left">
                        <button
                          type="button"
                          data-testid={\`remove-\$\{index\}\`}
                          onClick={() => handleRemoveProduct(index)}
                          $1>
                          <X$2/>
                        </button>
                      </Tooltip>`
);

// 6. Guardar Factura
content = content.replace(
    /<button\s+type="button"\s+onClick=\{handleSaveFactura\}\s+disabled=\{isSaving\}\s+title="Guardar y procesar esta factura en el sistema"(.*?)>\s*([\s\S]*?)<\/button>/gs,
    `<Tooltip content="Guardar y procesar esta factura en el sistema" position="top">
                <button
                  type="button"
                  onClick={handleSaveFactura}
                  disabled={isSaving}
                  $1>
                  $2
                </button>
              </Tooltip>`
);

// 7. Ver lista de facturas
content = content.replace(
    /<button\s+onClick=\{\(\) => router\.push\('\/facturas'\)\}\s+title="Ver la lista completa de facturas registradas"(.*?)>\s*Ver lista de facturas\s*<\/button>/gs,
    `<Tooltip content="Ver la lista completa de facturas registradas" position="top">
            <button
              onClick={() => router.push('/facturas')}
              $1>
              Ver lista de facturas
            </button>
          </Tooltip>`
);

// 8. Crear otra factura
content = content.replace(
    /<button\s+onClick=\{\(\) => \{\s+setSaveSuccess\(false\);\s+setFacturaGenerada\(null\);\s+setSelectedProveedor\(null\);\s+setProductos\(\[\{ codigo: "", descripcion: "", cantidad: 1, pvp: 0, grabaIva: true, porcentajeIva: 15 \}\]\);\s+setTipoPago\('CONTADO'\);\s+setFechaVencimiento\(''\);\s+\}\}\s+title="Limpiar formulario para crear una nueva factura"(.*?)>\s*Crear otra factura\s*<\/button>/gs,
    `<Tooltip content="Limpiar formulario para crear una nueva factura" position="top">
            <button
              onClick={() => {
                setSaveSuccess(false);
                setFacturaGenerada(null);
                setSelectedProveedor(null);
                setProductos([{ codigo: "", descripcion: "", cantidad: 1, pvp: 0, grabaIva: true, porcentajeIva: 15 }]);
                setTipoPago('CONTADO');
                setFechaVencimiento('');
              }}
              $1>
              Crear otra factura
            </button>
          </Tooltip>`
);

fs.writeFileSync('src/components/FacturaForm.tsx', content);
console.log('Done!');
