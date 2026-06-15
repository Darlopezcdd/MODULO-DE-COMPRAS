-- Trigger para asegurar inmutabilidad de la cabecera de factura de compra si ya se generó el PDF

CREATE OR REPLACE FUNCTION check_factura_inmutabilidad()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el estado anterior ya tenía pdf_generado = true, bloquear modificación
    IF OLD.pdf_generado = true THEN
        -- Permitir únicamente si es un proceso especial (por ejemplo si necesitas anularla, 
        -- aunque lo ideal es que ni siquiera se pueda modificar).
        -- Si intentan modificar campos, se lanza una excepción.
        IF (OLD.subtotal_sin_iva != NEW.subtotal_sin_iva OR 
            OLD.subtotal_con_iva != NEW.subtotal_con_iva OR 
            OLD.total_iva != NEW.total_iva OR 
            OLD.total != NEW.total OR
            OLD.proveedor_id != NEW.proveedor_id) THEN
            RAISE EXCEPTION 'No se puede modificar una factura cuyo PDF ya ha sido generado y entregado.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_factura_inmutabilidad
BEFORE UPDATE ON facturas_compra
FOR EACH ROW
EXECUTE FUNCTION check_factura_inmutabilidad();
