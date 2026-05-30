const http = require('http');

const targetUrl = new URL(process.env.LIBRETRANSLATE_BASE_URL || 'http://127.0.0.1:5001');
const timeoutMs = Number(process.env.LIBRETRANSLATE_WAIT_TIMEOUT_MS || 180000);
const intervalMs = Number(process.env.LIBRETRANSLATE_WAIT_INTERVAL_MS || 5000);
const startedAt = Date.now();

const checkLanguages = () =>
  new Promise((resolve, reject) => {
    const request = http.get(`${targetUrl.origin}/languages`, { timeout: 10000 }, (response) => {
      let body = '';

      response.on('data', (chunk) => {
        body += chunk;
      });

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(body);
          return;
        }

        reject(new Error(`LibreTranslate returned HTTP ${response.statusCode}`));
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('LibreTranslate health check timed out'));
    });

    request.on('error', reject);
  });

const wait = async () => {
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await checkLanguages();
      console.log(`LibreTranslate is ready at ${targetUrl.origin}`);
      return;
    } catch (error) {
      const secondsLeft = Math.ceil((timeoutMs - (Date.now() - startedAt)) / 1000);
      console.log(`Waiting for LibreTranslate at ${targetUrl.origin} (${secondsLeft}s left): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  console.error('LibreTranslate did not become ready before the timeout.');
  console.error('Check Docker Desktop, then run: npm run translate:logs');
  process.exit(1);
};

wait();
