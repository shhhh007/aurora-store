/* ============================================================
   AURORA — отдача фото товаров из R2: GET /img/:key
   ============================================================ */

export async function onRequestGet({ params, env }) {
  if (!env.MEDIA) {
    return new Response('R2 binding MEDIA is not configured', { status: 503 });
  }
  const key = String(params.key || '');
  if (!/^[\w.-]+$/.test(key)) {
    return new Response('Bad key', { status: 400 });
  }
  const obj = await env.MEDIA.get(key);
  if (!obj) {
    return new Response('Not found', { status: 404 });
  }
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
}
