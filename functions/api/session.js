/* ============================================================
   AURORA API — статус сессии и конфигурации (для админки)
   ============================================================ */

import { json, isAuthed, caps } from './_lib.js';

export async function onRequestGet({ request, env }) {
  const authed = await isAuthed(request, env);
  return json({ ok: true, authed, configured: caps(env) });
}
