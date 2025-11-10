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

// Функція для отримання шляху до файлу в кеші
function getCacheFilePath(code) {
  return path.join(options.cache, `${code}.jpg`);
}

// Створення HTTP сервера
const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Отримання HTTP коду з URL
  const code = req.url.slice(1); // Видаляємо "/" на початку

  if (!code) {
    res.writeHead(400);
    res.end('HTTP code is required');
    return;
  }

  const filePath = getCacheFilePath(code);

  try {
    if (req.method === 'GET') {
      // GET - отримати картинку з кешу або з http.cat
      try {
        // Спробувати отримати з кешу
        const image = await fs.readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(image);
        console.log(`Картинка ${code} надіслана з кешу`);
      } catch (error) {
        // Якщо немає в кеші, запитати з http.cat
        console.log(`Картинка ${code} відсутня в кеші, запит до http.cat`);

        try {
          const response = await superagent
            .get(`https://http.cat/${code}`)
            .responseType('blob');

          const imageBuffer = response.body;
          // Зберегти в кеш
          await fs.writeFile(filePath, imageBuffer);
          console.log(`Картинка ${code} збережена в кеш`);
          // Відправити клієнту
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(imageBuffer);
        } catch (fetchError) {
          console.error(`Помилка запиту до http.cat: ${fetchError.message}`);
          res.writeHead(404);
          res.end('Not Found');
        }
      }
    } else if (req.method === 'PUT') {
      // PUT - зберегти картинку в кеш
      const chunks = [];
      req.on('data', chunk => {
        chunks.push(chunk);
      });
      req.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          await fs.writeFile(filePath, buffer);
          console.log(`Картинка ${code} збережена через PUT`);
          res.writeHead(201);
          res.end('Created');
        } catch (writeError) {
          console.error('Помилка запису:', writeError);
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      });
    } else if (req.method === 'DELETE') {
      // DELETE - видалити картинку з кешу
      try {
        await fs.unlink(filePath);
        console.log(`Картинка ${code} видалена з кешу`);
        res.writeHead(200);
        res.end('Deleted');
      } catch (error) {
        console.log(`Картинка ${code} не знайдена для видалення`);
        res.writeHead(404);
        res.end('Not Found');
      }
    } else {
      // Інші методи не підтримуються
      res.writeHead(405);
      res.end('Method Not Allowed');
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

// Запуск сервера
server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
  console.log('Натисніть Ctrl+C для зупинки');
});
