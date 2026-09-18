import {connectPostgres} from './postgres.mjs';
import {stagingConfig} from './staging-config.mjs';
import {createApp} from './index.mjs';

async function main() {
  stagingConfig();
  const db = await connectPostgres();
  const app = await createApp({database: db, staging: stagingConfig(), seed: false, migrate: false, deliveryWorker: false});
  let stopping = false;
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => {stopping = true;});
  console.log('Private staging worker ready. No real courier calls.');
  try {
    while (!stopping) {
      try { await app.expireReservations(); await app.processDeliveries();
        await db.query("INSERT INTO worker_heartbeats(name,last_seen) VALUES('delivery',now()) ON CONFLICT(name) DO UPDATE SET last_seen=now()");
      } catch { console.error('Worker pass failed; persisted jobs will be retried.'); }
      if (!stopping) await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } finally { await app.close(); }
}
main().catch(() => {console.error('Worker startup failed. Check configuration and migration.'); process.exitCode = 1;});
