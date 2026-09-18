export function stagingConfig(env = process.env) {
  if (env.LEBSE_ENV !== 'staging' || env.LEBSE_TEST_MODE !== 'true') {
    throw new Error('Hosted startup requires explicit private staging and test mode.');
  }
  const origin = new URL(env.LEBSE_STAGING_ORIGIN || 'invalid:');
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('LEBSE_STAGING_ORIGIN must be an exact HTTPS origin.');
  }
  for (const key of ['LEBSE_GATEWAY_SECRET','LEBSE_OPS_TOKEN','LEBSE_TEST_WEBHOOK_SECRET']) {
    if (!env[key] || env[key].length < 32) throw new Error(`${key} requires at least 32 characters.`);
  }
  if (new Set([env.LEBSE_GATEWAY_SECRET,env.LEBSE_OPS_TOKEN,env.LEBSE_TEST_WEBHOOK_SECRET]).size !== 3) {
    throw new Error('Gateway, operator and webhook credentials must be distinct.');
  }
  if (env.LEBSE_DELIVERY_PROVIDER && env.LEBSE_DELIVERY_PROVIDER !== 'mock') throw new Error('Only simulated delivery is available in staging.');
  const port = Number(env.PORT || 10000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  return {origin: origin.origin, gatewaySecret: env.LEBSE_GATEWAY_SECRET, port};
}
