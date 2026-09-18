import {connectPostgres} from './postgres.mjs';
import {stagingConfig} from './staging-config.mjs';
import {createApp} from './index.mjs';

async function main() {
  const staging = stagingConfig();
  const db = await connectPostgres();
  let app;
  try { app = await createApp({database: db, staging, seed: false, migrate: false, deliveryWorker: false}); }
  catch (error) { await db.close(); throw error; }
  await app.start(staging.port, '0.0.0.0');
  console.log('Private staging API ready. Payments and delivery are simulated.');
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, async () => {await app.close(); process.exit(0);});
}
main().catch(() => {console.error('Staging startup failed. Check configuration, migration and database access.'); process.exitCode = 1;});
