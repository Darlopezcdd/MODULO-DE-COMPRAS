const q = 'mutation Login($u: String!, $p: String!) { login(username: $u, password: $p, moduloId: 3) { token success } }'; 
fetch('https://proyecto-moduloseguridad.onrender.com/graphql/', { 
  method: 'POST', 
  headers: {'Content-Type': 'application/json'}, 
  body: JSON.stringify({query: q, variables: {u: 'admin', p: 'admin'}}) 
})
.then(r=>r.json())
.then(d=>{
  const token = d.data.login.token;
  console.log("Got token:", token);
  return fetch('https://api-inventario-v1gh.onrender.com/api/kardex/movimientos', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
    body: JSON.stringify({ tipoMovimiento: 'COMPRA', documentoReferencia: 'TEST-123', fechaMovimiento: new Date().toISOString(), detalles: [ { codigoProducto: 'PRD-0009', cantidad: 1, precioVenta: 0, costoUnitario: 10, descripcion: 'Test' } ] }) 
  });
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
