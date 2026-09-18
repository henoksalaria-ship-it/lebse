import {createHash,timingSafeEqual} from 'node:crypto';
import {next,rewrite} from '@vercel/functions/middleware';

const headers = {'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'};
export function stagingGateway(request, env = process.env) {
  const hash = env.LEBSE_STAGING_PASSWORD_SHA256;
  const secret = env.LEBSE_GATEWAY_SECRET;
  let upstream, origin;
  try {upstream = new URL(env.LEBSE_RENDER_ORIGIN); origin = new URL(env.LEBSE_STAGING_ORIGIN);} catch {}
  const validOrigin = u => u?.protocol === 'https:' && !u.username && !u.password && u.pathname === '/' && !u.search && !u.hash;
  if (env.LEBSE_ENV !== 'staging' || !/^[a-f0-9]{64}$/.test(hash || '') || !env.LEBSE_STAGING_USER ||
      !secret || secret.length < 32 || !validOrigin(upstream) || !validOrigin(origin)) {
    return new Response('Private staging is not configured.', {status:503,headers});
  }
  const url = new URL(request.url);
  // No preview alias silently inherits access to a shared staging database.
  if (url.origin !== origin.origin) return new Response('Unconfigured staging address.', {status:403,headers});
  let user = '', password = '';
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6),'base64').toString('utf8');
    const at = decoded.indexOf(':');
    if (at >= 0) {user = decoded.slice(0,at); password = decoded.slice(at+1);}
  }
  const actual = createHash('sha256').update(password).digest();
  if (user !== env.LEBSE_STAGING_USER || !timingSafeEqual(actual, Buffer.from(hash,'hex'))) {
    return new Response('Private Lebse staging. Sign in with your testing access.', {status:401,
      headers:{...headers,'WWW-Authenticate':'Basic realm="Lebse private staging", charset="UTF-8"'}});
  }
  if (!url.pathname.startsWith('/api/')) return next({headers});
  const suppliedOrigin = request.headers.get('origin');
  if (suppliedOrigin && suppliedOrigin !== origin.origin) return new Response('Origin is not allowed.',{status:403,headers});
  // Stay below the routing middleware body limit. Large media moves to signed
  // Storage uploads in the subsequent production-auth/storage milestone.
  if (Number(request.headers.get('content-length') || 0) > 3500000) {
    return Response.json({error:'This staging upload is too large. Use fewer or smaller photos (under 3.5 MB total).'}, {status:413,headers});
  }
  const forwarded = new Headers();
  for (const key of ['content-type','cookie','x-lebse-request','x-csrf-token','x-lebse-ops-key','x-lebse-test-timestamp','x-lebse-test-signature']) {
    const value = request.headers.get(key); if (value) forwarded.set(key,value);
  }
  forwarded.set('origin',origin.origin);
  forwarded.set('x-lebse-gateway',secret);
  // Shared staging limiter is conservative. Do not trust caller-supplied IPs.
  forwarded.set('x-lebse-client-ip','private-staging');
  return rewrite(new URL(url.pathname + url.search, upstream),{headers,request:{headers:forwarded}});
}
