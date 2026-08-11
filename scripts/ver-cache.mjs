/** Decodifica o cache de fetch do Next para ver o que ficou guardado. */
import fs from "node:fs";

const dir = ".next/cache/fetch-cache";
for (const nome of fs.readdirSync(dir)) {
  if (nome === "tags-manifest.json") continue;
  const caminho = `${dir}/${nome}`;
  const stat = fs.statSync(caminho);
  let corpo = "";
  try {
    const json = JSON.parse(fs.readFileSync(caminho, "utf8"));
    corpo = Buffer.from(json?.data?.body ?? "", "base64").toString("utf8");
  } catch {
    corpo = "(não deu para decodificar)";
  }
  const ehBanco = corpo.includes("precifier") || corpo.includes("result");
  console.log(`\n=== ${nome.slice(0, 12)}...  ${stat.mtime.toISOString().slice(0, 19)}  ${stat.size}b`);
  console.log(`    leitura do banco: ${ehBanco}`);
  console.log(`    contém "Macarrão": ${corpo.includes("Macarr")}`);
  console.log(`    contém "LASANHA": ${corpo.includes("LASANHA")}`);
  console.log(`    início: ${corpo.slice(0, 150).replace(/\s+/g, " ")}`);
}
