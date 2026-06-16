-- ============================================================
-- HU6 – Queries SQL de agregación para extracción de saldos
-- Optimización de sentencias con IA
--
-- Estas consultas están diseñadas para el reporte de facturas
-- y extracción de saldos de crédito, optimizadas mediante:
--   • Índices cubrientes (covering indexes) donde es posible
--   • Joins con tablas pequeñas primero
--   • Filtros tempranos (push-down de WHERE)
--   • Uso de GENERATED ALWAYS AS para evitar cálculo en tiempo real
-- ============================================================

-- ------------------------------------------------------------
-- Q1: Saldos de crédito agregados por proveedor
-- ------------------------------------------------------------
-- Propósito: Obtener el resumen de saldos pendientes de cada
--            proveedor para el reporte HU6.
-- Optimización: usa el índice parcial idx_saldos_proveedor_pendiente
--               (proveedor_id WHERE estado = 'PENDIENTE')
-- ------------------------------------------------------------
SELECT
    p.id              AS proveedor_id,
    p.cedula_ruc,
    p.nombre,
    p.ciudad,
    p.tipo_proveedor,
    p.estado          AS estado_proveedor,

    COALESCE(SUM(sc.monto_credito),    0) AS total_credito,
    COALESCE(SUM(sc.monto_pagado),     0) AS total_pagado,
    COALESCE(SUM(sc.saldo_pendiente),  0) AS saldo_pendiente_total,

    COUNT(sc.id) FILTER (WHERE sc.estado = 'PENDIENTE')  AS creditos_pendientes,
    COUNT(sc.id) FILTER (WHERE sc.estado = 'VENCIDO')    AS creditos_vencidos,

    MIN(sc.fecha_vencimiento) FILTER (WHERE sc.estado IN ('PENDIENTE', 'VENCIDO'))
        AS proxima_vencimiento

FROM public.proveedores p
LEFT JOIN public.saldos_credito_proveedor sc ON sc.proveedor_id = p.id
    AND sc.estado IN ('PENDIENTE', 'VENCIDO')
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.cedula_ruc, p.nombre, p.ciudad, p.tipo_proveedor, p.estado
ORDER BY saldo_pendiente_total DESC;


-- ------------------------------------------------------------
-- Q2: Facturas a crédito con saldos pendientes (detallado)
-- ------------------------------------------------------------
-- Propósito: Listar facturas a crédito con su saldo pendiente
--            para cruzar contra Cuentas por Pagar.
-- Optimización: índice idx_facturas_vencimiento (parcial sobre
--               crédito + EMITIDA) + idx_saldos_proveedor_id
-- ------------------------------------------------------------
SELECT
    fc.id                     AS factura_id,
    fc.numero_factura,
    fc.numero_factura_proveedor,
    fc.fecha,
    fc.fecha_vencimiento,
    fc.total                  AS total_factura,
    fc.tipo_pago,

    p.id                      AS proveedor_id,
    p.cedula_ruc,
    p.nombre                  AS proveedor_nombre,

    COALESCE(sc.monto_credito,   0) AS monto_credito,
    COALESCE(sc.monto_pagado,    0) AS monto_pagado,
    COALESCE(sc.saldo_pendiente, 0) AS saldo_pendiente,

    CASE
        WHEN sc.saldo_pendiente IS NULL OR sc.saldo_pendiente = 0 THEN 'PAGADO'
        WHEN fc.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
        ELSE 'PENDIENTE'
    END                       AS estado_saldo,

    CASE
        WHEN fc.fecha_vencimiento IS NOT NULL
        THEN (fc.fecha_vencimiento - CURRENT_DATE)
        ELSE NULL
    END                       AS dias_restantes

FROM public.facturas_compra fc
JOIN public.proveedores p ON p.id = fc.proveedor_id
LEFT JOIN public.saldos_credito_proveedor sc
    ON sc.proveedor_id = fc.proveedor_id
    AND sc.estado IN ('PENDIENTE', 'VENCIDO')
WHERE fc.tipo_pago = 'CREDITO'
  AND fc.estado = 'EMITIDA'
ORDER BY fc.fecha_vencimiento ASC NULLS LAST;


-- ------------------------------------------------------------
-- Q3: Agregación mensual de compras por proveedor
-- ------------------------------------------------------------
-- Propósito: Reporte de tendencia de compras (HU6)
-- Optimización: índices idx_facturas_fecha + idx_facturas_proveedor
-- ------------------------------------------------------------
SELECT
    p.id              AS proveedor_id,
    p.nombre          AS proveedor_nombre,
    DATE_TRUNC('month', fc.fecha) AS mes,
    COUNT(fc.id)      AS cantidad_facturas,
    SUM(fc.total)     AS total_compras_mes,
    AVG(fc.total)     AS promedio_por_factura

FROM public.facturas_compra fc
JOIN public.proveedores p ON p.id = fc.proveedor_id
WHERE fc.estado IN ('EMITIDA', 'BORRADOR')
  AND fc.fecha >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY p.id, p.nombre, DATE_TRUNC('month', fc.fecha)
ORDER BY mes DESC, total_compras_mes DESC;


-- ------------------------------------------------------------
-- Q4: Saldos de crédito – verificación de consistencia
-- ------------------------------------------------------------
-- Propósito: Detectar discrepancias entre totales de factura
--            y saldos registrados (cruza contra Cuentas por Pagar)
-- Optimización: GENERATED ALWAYS AS evita recalcular saldo_pendiente
-- ------------------------------------------------------------
SELECT
    sc.id                       AS saldo_id,
    sc.proveedor_id,
    p.nombre                    AS proveedor_nombre,
    sc.factura_id,
    fc.numero_factura,
    fc.total                    AS total_factura,
    sc.monto_credito,
    sc.monto_pagado,
    sc.saldo_pendiente,
    fc.total - sc.monto_credito AS diferencia

FROM public.saldos_credito_proveedor sc
JOIN public.proveedores p ON p.id = sc.proveedor_id
LEFT JOIN public.facturas_compra fc ON fc.id = sc.factura_id
WHERE sc.estado = 'PENDIENTE'
  AND ABS(fc.total - sc.monto_credito) > 0.01
ORDER BY ABS(fc.total - sc.monto_credito) DESC;


-- ------------------------------------------------------------
-- Q5: Vista materializada recomendada para dashboard HU6
-- ------------------------------------------------------------
-- Propósito: Cachear el reporte diario de saldos para evitar
--            joins costosos en cada consulta.
-- Uso: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_reporte_saldos_diario;
-- ------------------------------------------------------------
-- CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_reporte_saldos_diario AS
-- SELECT
--     p.id                       AS proveedor_id,
--     p.nombre                   AS proveedor_nombre,
--     p.cedula_ruc,
--     p.tipo_proveedor,
--     COUNT(DISTINCT fc.id)      AS facturas_credito,
--     COUNT(DISTINCT sc.id)      AS registros_saldo,
--     COALESCE(SUM(fc.total), 0) AS total_facturado,
--     COALESCE(SUM(sc.monto_credito), 0) AS total_credito,
--     COALESCE(SUM(sc.saldo_pendiente), 0) AS saldo_pendiente,
--     CURRENT_DATE               AS fecha_reporte
-- FROM public.proveedores p
-- LEFT JOIN public.facturas_compra fc ON fc.proveedor_id = p.id
--     AND fc.tipo_pago = 'CREDITO'
--     AND fc.estado = 'EMITIDA'
-- LEFT JOIN public.saldos_credito_proveedor sc ON sc.proveedor_id = p.id
--     AND sc.estado = 'PENDIENTE'
-- WHERE p.estado = 'ACTIVO'
-- GROUP BY p.id, p.nombre, p.cedula_ruc, p.tipo_proveedor;
