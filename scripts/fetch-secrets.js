const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const fs = require("fs");
const path = require("path");

async function init() {
  const secret_name = "compras/db-credentials-7hxUNN"; // Nombre base o ARN parcial
  
  const client = new SecretsManagerClient({
    region: "us-east-1",
  });

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT",
      })
    );

    if (response.SecretString) {
      const secret = JSON.parse(response.SecretString);
      
      // Armamos la variable DATABASE_URL a partir del JSON si vienen divididos
      // o usamos la variable completa si ya viene armada.
      let databaseUrl = secret.DATABASE_URL;
      
      if (!databaseUrl && secret.username && secret.password && secret.engine && secret.host && secret.port && secret.dbname) {
          databaseUrl = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.dbname}`;
      }

      if (databaseUrl) {
          const envContent = `DATABASE_URL="${databaseUrl}"\nNODE_ENV="production"\n`;
          const envPath = path.join(__dirname, '..', '.env.production');
          fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });
          console.log("✅ Secretos obtenidos correctamente. Archivo .env.production generado.");
      } else {
          console.error("❌ El secreto descargado no contiene DATABASE_URL ni credenciales válidas.");
      }
    }
  } catch (error) {
    console.error("❌ Fallo al obtener los secretos de AWS:", error);
    process.exit(1);
  }
}

init();
