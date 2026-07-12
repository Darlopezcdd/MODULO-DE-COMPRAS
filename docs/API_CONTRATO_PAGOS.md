# Especificación del Contrato API: Procesamiento de Pagos a Proveedores

**Historia de Usuario**: HU18 - API de Salida para Pagos de Cuentas  
**Diseño de Contrato**: Aldahir Requene  
**Implementación Backend**: Esaú Hidalgo  

Este documento define el contrato de datos (inputs, outputs, estados y errores) para la API de pagos a proveedores desde las cuentas bancarias de la empresa.

---

## 1. Procesamiento de Pago

Permite realizar un débito a una cuenta bancaria de la empresa y registrar el abono/pago de la deuda con un proveedor.

- **Endpoint**: `/api/tesoreria/pagar`
- **Método**: `POST`
- **Headers**:
  ```http
  Content-Type: application/json
  ```

### Request Payload (JSON)

```json
{
  "saldoId": 42,
  "cuentaBancariaId": "cta_001"
}
```

#### Descripción de campos:
| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `saldoId` | `Number` | Sí | ID del registro de la cuenta por pagar (saldo pendiente). |
| `cuentaBancariaId` | `String` | Sí | ID de la cuenta bancaria de la empresa desde la cual se debitará el dinero. |

---

### Response Payload (JSON)

#### 🟢 200 OK (Pago Procesado Exitosamente)
```json
{
  "success": true,
  "mensaje": "Pago registrado y debitado exitosamente.",
  "transaccion": {
    "id": "tx_987654321",
    "saldoId": 42,
    "cuentaBancariaId": "cta_001",
    "montoDebitado": 1250.75,
    "nuevoSaldoPendiente": 0.00,
    "fechaHora": "2026-07-12T15:55:00Z"
  },
  "nuevoSaldoCta": 48749.25
}
```

#### 🔴 400 Bad Request (Parámetros Inválidos o Datos Inconsistentes)
```json
{
  "success": false,
  "error": "Faltan datos requeridos: saldoId y cuentaBancariaId."
}
```

#### 🔴 400 Bad Request (Fondos Insuficientes)
```json
{
  "success": false,
  "error": "Fondos insuficientes en la cuenta Banco Pichincha (cta_001). Saldo disponible: $500.00, Monto requerido: $1250.75"
}
```

#### 🔴 404 Not Found (Cuenta o Saldo No Encontrado)
```json
{
  "success": false,
  "error": "La cuenta bancaria especificada no existe."
}
```

#### 🔴 500 Internal Server Error (Fallo de Integración con el Banco Externo)
```json
{
  "success": false,
  "error": "No se pudo establecer conexión con la API externa del banco. Intente nuevamente en unos minutos."
}
```

---

## 2. Consulta de Estado de Pago / Transacción

Permite rastrear el estado del procesamiento de una transacción bancaria.

- **Endpoint**: `/api/pagos/transaccion/{transaccionId}`
- **Método**: `GET`

### Response Payload (JSON)

#### 🟢 200 OK
```json
{
  "success": true,
  "transaccion": {
    "id": "tx_987654321",
    "estado": "COMPLETADO",
    "monto": 1250.75,
    "bancoOrigen": "Banco Pichincha",
    "cuentaDestino": "2100054321",
    "proveedor": "Distribuidora del Norte",
    "referenciaBancaria": "REF-8837192",
    "fechaHora": "2026-07-12T15:55:00Z"
  }
}
```

---

## 3. Flujo Lógico de Integración

1. El Frontend envía la solicitud HTTP `POST` a `/api/tesoreria/pagar`.
2. El Backend valida que los parámetros existan y que el saldo por pagar esté activo.
3. El Backend consulta a la API de cuentas bancarias y valida la disponibilidad de fondos.
4. El Backend registra el débito en la cuenta seleccionada.
5. El Backend actualiza el estado del saldo pendiente (cuenta por pagar) reduciendo el saldo o marcándolo como pagado.
6. El Backend retorna la respuesta correspondiente.
