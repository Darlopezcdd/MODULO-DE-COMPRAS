const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const fs = require("fs");
const path = require("path");

async function init() {
  const secret_name = "arn:aws:secretsmanager:us-east-1:946445280288:secret:compras/db-credentials-7hxUNN"; // ARN completo
  
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
      let databaseUrl = "";
      
      try {
        // Intentamos parsearlo como JSON si viene en formato Clave/Valor
        const secret = JSON.parse(response.SecretString);
        databaseUrl = secret.DATABASE_URL;
        
        if (!databaseUrl && secret.username && secret.password && secret.engine && secret.host && secret.port && secret.dbname) {
            databaseUrl = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.dbname}`;
        }
      } catch (e) {
        // Si no es JSON (lanza SyntaxError), asumimos que el secreto entero es la cadena de conexión
        databaseUrl = response.SecretString.trim();
      }

      if (databaseUrl) {
          const envContent = `DATABASE_URL="${databaseUrl}"\nNODE_ENV="production"\nNODE_TLS_REJECT_UNAUTHORIZED="0"\n`;
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
