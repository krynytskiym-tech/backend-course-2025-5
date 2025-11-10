import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { program } from 'commander';
import superagent from 'superagent';

// Налаштування параметрів командного рядка
program
  .requiredOption('-h, --host <host>', 'Адреса сервера')
  .requiredOption('-p, --port <port>', 'Порт сервера')
  .requiredOption('-c, --cache <path>', 'Шлях до директорії кешу');

program.parse();

const options = program.opts();

// Створення директорії кешу, якщо її не існує
try {
  await fs.mkdir(options.cache, { recursive: true });
  console.log(`Директорія кешу: ${options.cache}`);
} catch (error) {
  console.error('Помилка створення директорії кешу:', error.message);
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  res.writeHead(200);
  res.end('Server is running');
});

server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});
