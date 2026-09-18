import pg from 'pg';

// The existing marketplace expects bigint counters as numbers and timestamps as
// ISO strings. Parse bigint safely rather than silently rounding large values.
const types = {getTypeParser(oid, format) {
  if (oid === 20) return value => {
    const n = Number(value);
    if (!Number.isSafeInteger(n)) throw new Error('Database integer exceeds the supported range.');
    return n;
  };
  if (oid === 1184) return value => new Date(value).toISOString();
  return pg.types.getTypeParser(oid, format);
}};

export function connectionOptions(env = process.env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const url = new URL(env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Use a PostgreSQL connection URL.');
  // URL SSL options can override pg's explicit TLS configuration.
  for (const key of ['sslmode','sslcert','sslkey','sslrootcert']) {
    if (url.searchParams.has(key)) throw new Error('Remove SSL query options; verified TLS is configured by the adapter.');
  }
  if (url.search) throw new Error('Database URL query options are not supported.');
  return {connectionString: url.toString(), ssl: {rejectUnauthorized: true,
    ...(env.DATABASE_CA_CERT ? {ca: env.DATABASE_CA_CERT.replaceAll('\\n','\n')} : {})},
    max: 4, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000,
    statement_timeout: 30000, application_name: 'lebse-staging', types};
}

export function postgresAdapter(pool) {
  async function transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL search_path TO lebse_private, pg_catalog");
      await client.query("SET LOCAL lock_timeout = '10s'");
      // Deliberately serialize the private pilot across API/worker processes.
      // Replace with entity-level locking before high-volume production.
      await client.query('SELECT pg_advisory_xact_lock(726194, 1)');
      const tx = {query: (sql, args = []) => client.query(sql, args), exec: sql => client.query(sql)};
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  }
  return {kind: 'postgres', transaction,
    query: (sql, args = []) => transaction(tx => tx.query(sql, args)),
    exec: sql => transaction(tx => tx.exec(sql)), close: () => pool.end()};
}

export async function connectPostgres(env = process.env) {
  const pool = new pg.Pool(connectionOptions(env));
  pool.on('error', () => console.error('Idle database connection failed.'));
  const db = postgresAdapter(pool);
  try { await db.query('SELECT 1'); return db; }
  catch (error) { await db.close(); throw error; }
}
