/* ============================================================
   AURORA API — загрузка фото товара в R2 (только админ)
   POST multipart/form-data, поле "file"
   ============================================================ */

import { json, isAuthed } from './_lib.js';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export async function onRequestPost({ request, env }) {
  if (!env.MEDIA && !env.MEDIA_KV) {
    return json({ ok: false, error: 'No media storage bound (R2 "MEDIA" or KV "MEDIA_KV")' }, 503);
  }
  if (!(await isAuthed(request, env))) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return json({ ok: false, error: 'Expected a "file" field with an image' }, 400);
    }
    const ext = ALLOWED[file.type];
    if (!ext) {
      return json({ ok: false, error: 'Only JPEG, PNG, WebP, AVIF or GIF images are allowed' }, 400);
    }
    if (file.size > MAX_SIZE) {
      return json({ ok: false, error: 'Max file size is 5 MB' }, 400);
    }
    const buf = await file.arrayBuffer();
    const key = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    if (env.MEDIA) {
      await env.MEDIA.put(key, buf, { httpMetadata: { contentType: file.type } });
    } else {
      await env.MEDIA_KV.put(`img:${key}`, buf, { metadata: { contentType: file.type } });
    }
    return json({ ok: true, url: `/img/${key}` });
  } catch {
    return json({ ok: false, error: 'Upload failed' }, 500);
  }
}
