/**
 * Gera o hash bcrypt de uma senha para usar na variavel USER_PASSWORD_HASH.
 * Uso:  npm run hash "minha-senha-secreta"
 */
import bcrypt from "bcryptjs";

const senha = process.argv[2];

if (!senha) {
  console.error('\nInforme a senha entre aspas. Exemplo:\n  npm run hash "minha-senha-secreta"\n');
  process.exit(1);
}

const hash = bcrypt.hashSync(senha, 10);

console.log("\nCopie a linha abaixo para o seu .env.local (ou para a Vercel):\n");
console.log(`USER_PASSWORD_HASH=${hash}\n`);
