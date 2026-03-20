export async function onRequestGet(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  url.pathname = '/index.html';
  const response = await env.ASSETS.fetch(url.toString());
  let html = await response.text();
  html = html.replace('{{GOOGLE_API_KEY}}', env.GOOGLE_PLACES_API_KEY || '');
  return new Response(html, {
    headers: { 'content-type': 'text/html;charset=UTF-8' }
  });
}
