import { createServer } from 'node:http';

const upstream = 'http://127.0.0.1:3000/api/storefront/webhooks/cal';

createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/api/storefront/webhooks/cal') {
    response.writeHead(404).end();
    return;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 256_000) {
      response.writeHead(413).end();
      return;
    }
    chunks.push(chunk);
  }
  try {
    const upstreamResponse = await fetch(upstream, {
      method: 'POST',
      headers: {
        'content-type': request.headers['content-type'] || 'application/json',
        'x-cal-signature-256': request.headers['x-cal-signature-256'] || '',
      },
      body: Buffer.concat(chunks),
    });
    response.writeHead(upstreamResponse.status, { 'content-type': 'application/json' });
    response.end(await upstreamResponse.text());
  } catch {
    response.writeHead(502).end();
  }
}).listen(3001, '127.0.0.1', () => console.log('Webhook-only proxy listening on 127.0.0.1:3001'));
