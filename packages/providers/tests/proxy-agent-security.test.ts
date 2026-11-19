import test from 'node:test';
import assert from 'node:assert/strict';
import http, { type Server } from 'node:http';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

function listen(server: Server): Promise<string> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      resolve('http://127.0.0.1:' + address.port);
    });
  });
}

function get(url: string, agent: http.Agent): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { agent }, response => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve(Buffer.concat(chunks).toString()));
      response.on('error', reject);
    });
    request.setTimeout(5000, () => request.destroy(new Error('Local proxy request timed out')));
    request.on('error', reject);
  });
}

test('the SDK proxy dependency routes requests through the proxy without mixing destinations', { timeout: 10000 }, async t => {
  const sdkRequire = createRequire(import.meta.resolve('@mariozechner/pi-ai'));
  const { ProxyAgent } = await import(pathToFileURL(sdkRequire.resolve('proxy-agent')).href);
  const observed: string[] = [];
  const first = http.createServer((_request, response) => response.end('first origin'));
  const second = http.createServer((_request, response) => response.end('second origin'));
  const proxy = http.createServer((request, response) => {
    observed.push(request.url ?? '');
    const upstream = http.request(request.url!, { method: request.method, headers: request.headers }, incoming => {
      response.writeHead(incoming.statusCode ?? 502, incoming.headers);
      incoming.pipe(response);
    });
    upstream.on('error', error => response.destroy(error));
    request.pipe(upstream);
  });
  t.after(async () => {
    for (const server of [first, second, proxy]) server.closeAllConnections();
    await Promise.all([first, second, proxy].map(server => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))));
  });
  const firstUrl = await listen(first);
  const secondUrl = await listen(second);
  const proxyUrl = await listen(proxy);
  const proxyEnvKeys = ['http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY', 'all_proxy', 'ALL_PROXY', 'no_proxy', 'NO_PROXY'];
  const originalEnv = new Map(proxyEnvKeys.map(key => [key, process.env[key]] as const));
  for (const key of proxyEnvKeys) process.env[key] = key.toLowerCase() === 'no_proxy' ? '' : proxyUrl;
  t.after(() => {
    for (const [key, value] of originalEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  // The SDK uses the zero-argument constructor and environment-based proxy selection.
  const agent = new ProxyAgent();
  t.after(() => agent.destroy());
  assert.equal(await get(firstUrl + '/first', agent), 'first origin');
  assert.equal(await get(secondUrl + '/second', agent), 'second origin');
  assert.deepEqual(observed, [firstUrl + '/first', secondUrl + '/second']);
});
