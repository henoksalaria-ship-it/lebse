import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {connectPostgres} from '../server/postgres.mjs';
import {setupSecurity} from '../server/security.mjs';

// Run once using an owner connection. Runtime services use a separate restricted role.
if (process.env.LEBSE_ENV !== 'staging') throw new Error('Migration is restricted to staging.');
const db = await connectPostgres();
try {
  await db.transaction(async tx => {
    await tx.exec('CREATE SCHEMA IF NOT EXISTS lebse_private; REVOKE ALL ON SCHEMA lebse_private FROM PUBLIC;');
    const runtime = (await tx.query("SELECT rolname FROM pg_roles WHERE rolname='lebse_runtime'")).rows[0];
    if (!runtime) throw new Error('Create the restricted lebse_runtime login using the setup instructions first.');
    await tx.exec('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());');
    for (const file of ['schema.sql','security-schema.sql','delivery-schema.sql','seller-schema.sql','experience-schema.sql','onboarding-schema.sql']) {
      const sql = await readFile(new URL(`../server/${file}`, import.meta.url), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const old = (await tx.query('SELECT checksum FROM schema_migrations WHERE name=$1',[file])).rows[0];
      if (old && old.checksum !== checksum) throw new Error('Applied schema changed; add a forward migration.');
      if (!old) {await tx.exec(sql); await tx.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[file,checksum]);}
    }
    await setupSecurity(tx);
    await tx.exec("CREATE TABLE IF NOT EXISTS worker_heartbeats(name text PRIMARY KEY,last_seen timestamptz NOT NULL); CREATE TABLE IF NOT EXISTS staging_metadata(id boolean PRIMARY KEY DEFAULT true CHECK(id), environment text NOT NULL CHECK(environment='staging')); INSERT INTO staging_metadata VALUES(true,'staging') ON CONFLICT DO NOTHING;");
    await tx.exec(`REVOKE ALL ON ALL TABLES IN SCHEMA lebse_private FROM PUBLIC;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA lebse_private FROM PUBLIC;
      REVOKE ALL ON ALL FUNCTIONS IN SCHEMA lebse_private FROM PUBLIC;
      GRANT USAGE ON SCHEMA lebse_private TO lebse_runtime;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA lebse_private TO lebse_runtime;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA lebse_private TO lebse_runtime;
      REVOKE INSERT, UPDATE, DELETE ON schema_migrations, staging_metadata, legal_versions FROM lebse_runtime;`);
    for (const name of ['anon','authenticated','service_role']) {
      if ((await tx.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[name])).rows.length) {
        await tx.exec(`REVOKE ALL ON SCHEMA lebse_private FROM ${name}; REVOKE ALL ON ALL TABLES IN SCHEMA lebse_private FROM ${name}; REVOKE ALL ON ALL SEQUENCES IN SCHEMA lebse_private FROM ${name};`);
      }
    }
    // Defense in depth: only the server role can access marketplace rows.
    const tables = (await tx.query("SELECT tablename FROM pg_tables WHERE schemaname='lebse_private'")).rows;
    for (const {tablename} of tables) {
      const q = '"' + tablename.replaceAll('"','""') + '"';
      await tx.exec(`ALTER TABLE ${q} ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS server_access ON ${q}; CREATE POLICY server_access ON ${q} TO lebse_runtime USING(true) WITH CHECK(true);`);
    }
  });
  console.log('Staging schema migrated. Marketplace tables remain outside the public Data API.');
} finally { await db.close(); }
