/* ============================================================
   AURORA — отдача фото товаров: GET /img/:key
   R2 (binding MEDIA) если настроен, иначе фолбэк на KV (MEDIA_KV)
   ============================================================ */

export async function onRequestGet({ params, env }) {
  const key = String(params.key || '');
  if (!/^[\w.-]+$/.test(key)) {
    return new Response('Bad key', { status: 400 });
  }

  // R2 — основной вариант
  if (env.MEDIA) {
    const obj = await env.MEDIA.get(key);
    if (!obj) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(obj.body, { headers });
  }

  // Фолбэк: фото в KV
  if (env.MEDIA_KV) {
    const { value, metadata } = await env.MEDIA_KV.getWithMetadata(`img:${key}`, {
      type: 'arrayBuffer',
    });
    if (!value) return new Response('Not found', { status: 404 });
    return new Response(value, {
      headers: {
        'Content-Type': (metadata && metadata.contentType) || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return new Response('No media storage bound', { status: 503 });
}
