/* ============================================================
   AURORA API — вход в админку
   ============================================================ */

import { json, createSessionCookie } from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) {
    return json({
      ok: false,
      error: 'ADMIN_PASSWORD is not set. Add it in Cloudflare Pages → Settings → Environment variables (see README.md).',
    }, 503);
  }
  const body = await request.json().catch(() => ({}));
  if (!body.password || body.password !== env.ADMIN_PASSWORD) {
    return json({ ok: false, error: 'Wrong password' }, 401);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': await createSessionCookie(env) });
}
