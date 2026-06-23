async function run() {
  const t = await fetch('https://api-inventario-v1gh.onrender.com/api/swagger-ui-init.js').then(r => r.text());
  const optionsMatch = t.match(/let options = (\{[\s\S]*?\});\s*url = options\.swaggerUrl/);
  if (optionsMatch) {
    try {
      const swaggerJsonStr = optionsMatch[1].replace(/'/g, '"');
      const swaggerData = eval('(' + optionsMatch[1] + ')'); 
      if(swaggerData.swaggerDoc) {
         console.log(Object.keys(swaggerData.swaggerDoc.paths));
      }
    } catch(e) { console.log(e); }
  } else {
    console.log("Not found");
  }
}
run();
