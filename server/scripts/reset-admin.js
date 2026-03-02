/**
 * Remove o arquivo de usuários para que, na próxima subida do servidor,
 * o admin seja recriado com a senha definida no .env (ADMIN_PASSWORD).
 * Uso: node server/scripts/reset-admin.js
 * Depois: npm start
 */
const path = require('path');
const fs = require('fs').promises;

const dataDir = path.join(__dirname, '..', 'data');
const usersFile = path.join(dataDir, 'users.json');

async function main() {
  try {
    await fs.unlink(usersFile);
    console.log('[NebulaClean] Arquivo de usuários removido. Reinicie o servidor (npm start) para recriar o admin com a senha do .env.');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('[NebulaClean] Nenhum arquivo de usuários encontrado. Ao iniciar o servidor, o admin será criado com a senha do .env.');
      return;
    }
    console.error('[NebulaClean] Erro ao resetar:', err.message);
    process.exit(1);
  }
}

main();
