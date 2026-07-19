const { Client } = require('pg');

async function testConnection(url) {
  const client = new Client({ 
    connectionString: url,
    ssl: { rejectUnauthorized: false } //  ¡ESTA ES LA CLAVE PARA AWS RDS!
  });
  
  try {
    await client.connect();
    console.log('\n ¡BINGO! LA URL CORRECTA ES:');
    console.log(url);
    await client.end();
    return true;
  } catch (e) {
    console.log(' Falló la base:', url.split('/')[3].split('?')[0], 'con usuario:', url.split('://')[1].split(':')[0], '->', e.message);
    return false;
  }
}

async function run() {
  const urls = [
    'postgresql://comprasadmin:ComprasPass123!@compras-db.cszu8my04xvq.us-east-1.rds.amazonaws.com:5432/compras_db?schema=public',
    'postgresql://comprasadmin:ComprasPass123!@compras-db.cszu8my04xvq.us-east-1.rds.amazonaws.com:5432/compras?schema=public',
    'postgresql://comprasadmin:ComprasPass123!@compras-db.cszu8my04xvq.us-east-1.rds.amazonaws.com:5432/postgres?schema=public',
    'postgresql://postgres:Daniel102030*@compras-db.cszu8my04xvq.us-east-1.rds.amazonaws.com:5432/compras_db?schema=public',
    'postgresql://postgres:Daniel102030*@compras-db.cszu8my04xvq.us-east-1.rds.amazonaws.com:5432/compras?schema=public',
    'postgresql://postgres:Daniel102030*@compras-db.cszu8my04xvq.us-east-1.rds.amazonaws.com:5432/postgres?schema=public'
  ];
  console.log("Probando combinaciones en Amazon RDS con SSL activado...\n");
  for (let url of urls) {
    const success = await testConnection(url);
    if(success) break;
  }
}
run();
