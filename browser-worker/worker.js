/* global btoa, addEventListener */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const HDR = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

function isCF(text) {
  return text && text.length > 50 && text.includes('Just a moment') && (text.includes('security verification') || text.includes('checking your browser') || text.includes('Please stand by') || text.includes('DDoS protection') || text.includes('Enable JavaScript') || text.includes('challenge-platform') || text.includes('cf_chl_opt'));
}

async function tryFetch(url, retries) {
  for (let i = 0; i < retries; i++) {
    if (i > 0) await new Promise(function(r) { setTimeout(r, 500 * (i + 1)); });
    try {
      const res = await fetch(url, { headers: HDR, redirect: 'follow' });
      const t = await res.text();
      if (!isCF(t)) return { text: t, ok: true };
    } catch(e) { if (i === retries - 1) throw e; }
  }
  return null;
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const p = url.pathname;

  if (p === '/health' || p === '/') {
    return new Response(JSON.stringify({ status: 'ok', worker: 'munch-scraper' }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (p === '/raw') {
    const target = url.searchParams.get('url');
    if (!target) return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const r = await tryFetch(target, 3);
    if (r) {
      return new Response(JSON.stringify({ status: 200, length: r.text.length, isChallenge: false, html_b64: btoa(r.text) }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    const res = await fetch(target, { headers: HDR, redirect: 'follow' });
    const t = await res.text();
    return new Response(JSON.stringify({ status: res.status, length: t.length, isChallenge: isCF(t), html_b64: btoa(t) }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  if (p === '/scrape') {
    const target = url.searchParams.get('url');
    if (!target) return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const r = await tryFetch(target, 3);
    if (!r) {
      const res = await fetch(target, { headers: HDR, redirect: 'follow' });
      const t = await res.text();
      return new Response(t, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'X-Fetch-Is-Challenge': isCF(t) ? 'true' : 'false' } });
    }
    return new Response(r.text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
  }

  return new Response('Not found', { status: 404 });
}

addEventListener('fetch', function(e) { e.respondWith(handleRequest(e.request)); });
