/* ============================================================
   AURORA — общие хелперы Pages Functions: JSON, cookie, HMAC-сессии
   ============================================================ */

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

async function hmac(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const SESSION_TTL_MS = 7 * 24 * 3600 * 1000; // 7 дней

export async function createSessionCookie(env) {
  const exp = Date.now() + SESSION_TTL_MS;
  const sig = await hmac(env.SESSION_SECRET || 'aurora-dev-secret', `aurora-admin:${exp}`);
  const token = `${exp}.${sig}`;
  return `aurora_session=${token}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function clearSessionCookie() {
  return 'aurora_session=; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=0';
}

export async function isAuthed(request, env) {
  const cookie = getCookie(request, 'aurora_session');
  if (!cookie) return false;
  const [expStr, sig] = cookie.split('.');
  const exp = Number(expStr);
  if (!exp || !Number.isFinite(exp) || exp < Date.now() || !sig) return false;
  const expected = await hmac(env.SESSION_SECRET || 'aurora-dev-secret', `aurora-admin:${exp}`);
  return sig === expected;
}

export function caps(env) {
  return {
    kv: Boolean(env.PRODUCTS),
    r2: Boolean(env.MEDIA),
    kvMedia: Boolean(env.MEDIA_KV),
    media: Boolean(env.MEDIA || env.MEDIA_KV),
    password: Boolean(env.ADMIN_PASSWORD),
  };
}
