export function validarIdentificacionEcuador(identificacion: string): boolean {
  if (!identificacion) return false;
  
  const id = identificacion.trim();
  if (id.length !== 10 && id.length !== 13) return false;
  if (!/^\d+$/.test(id)) return false;

  const provincia = parseInt(id.substring(0, 2), 10);
  if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false; 

  if (id.length === 10) {
    // Validar Cédula (Personas Naturales)
    const tercerDigito = parseInt(id.charAt(2), 10);
    if (tercerDigito >= 6) return false; 

    const digitos = id.split('').map(Number);
    const verificador = digitos.pop()!;
    let suma = 0;
    
    for (let i = 0; i < digitos.length; i++) {
      let valor = digitos[i];
      if (i % 2 === 0) {
        valor *= 2;
        if (valor > 9) valor -= 9;
      }
      suma += valor;
    }
    
    const decenaSuperior = Math.ceil(suma / 10) * 10;
    const digitoCalculado = decenaSuperior - suma;
    return digitoCalculado === verificador || (digitoCalculado === 10 && verificador === 0);
  } else {
    // Validar RUC (13 dígitos)
    const tercerDigito = parseInt(id.charAt(2), 10);
    const sufijo = id.substring(10, 13);
    if (sufijo !== '001') return false; 

    const digitos = id.split('').map(Number);
    
    if (tercerDigito < 6) { 
      // RUC Persona Natural
      const cedula = id.substring(0, 10);
      return validarIdentificacionEcuador(cedula);
    } else if (tercerDigito === 6) { 
      // RUC Sociedad Pública
      const verificador = digitos[8];
      const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
      let suma = 0;
      for (let i = 0; i < 8; i++) {
          suma += digitos[i] * coeficientes[i];
      }
      const residuo = suma % 11;
      const digitoCalculado = residuo === 0 ? 0 : 11 - residuo;
      return digitoCalculado === verificador;
    } else if (tercerDigito === 9) { 
      // RUC Sociedad Privada
      const verificador = digitos[9];
      const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
      let suma = 0;
      for (let i = 0; i < 9; i++) {
          suma += digitos[i] * coeficientes[i];
      }
      const residuo = suma % 11;
      const digitoCalculado = residuo === 0 ? 0 : 11 - residuo;
      return digitoCalculado === verificador;
    }
    return false;
  }
}
