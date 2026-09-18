import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/index.mjs';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const scratchRoot = path.join(workspace, 'work', 'integration-tests');

export async function startTestApp(options = {}) {
  await mkdir(scratchRoot, { recursive: true });
  const folder = await mkdtemp(path.join(scratchRoot, 'marketplace-'));
  const dataDir = path.join(folder, 'database');
  let app;
  let origin;
  async function open() {
    app = await createApp({ dataDir, seed: false, allowBearer: true, deliveryWorker:false, backupDir:path.join(folder,'backups'), ...options });
    const port = await app.start(0);
    origin = `http://127.0.0.1:${port}`;
  }
  await open();
  return {
    get app() { return app; },
    get origin() { return origin; },
    dataDir,
    async restart() {
      await app.close();
      await open();
    },
    async request(route, { method = 'GET', token, body, headers = {} } = {}) {
      const response = await fetch(`${origin}/api${route}`, {
        method,
        headers: {
          ...(body === undefined ? {} : { 'content-type': 'application/json', 'x-lebse-request': '1' }),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : null; }
      catch { assert.fail(`${method} ${route} returned non-JSON (${response.status}): ${text.slice(0, 300)}`); }
      return { status: response.status, data, headers: response.headers };
    },
    async close() {
      if (app) await app.close();
      const target = path.resolve(folder);
      const boundary = path.resolve(scratchRoot) + path.sep;
      assert.ok(target.startsWith(boundary), 'Test cleanup stays within work/integration-tests');
      await rm(target, { recursive: true, force: true, maxRetries: 5 });
    },
  };
}

export function expectStatus(result, expected) {
  const accepted = Array.isArray(expected) ? expected : [expected];
  assert.ok(accepted.includes(result.status), `Expected HTTP ${accepted.join('/')} but got ${result.status}: ${JSON.stringify(result.data)}`);
  return result.data;
}

export const unique = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 12)}`;
export const TEST_PASSWORD = 'LebseTest2026!';
