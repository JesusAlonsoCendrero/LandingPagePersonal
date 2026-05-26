// Allowed origins. Para producción, sustituye '*' por tu dominio real.
// Ejemplo: ['https://jesusalonsocendrero.web.app', 'http://localhost:5500']
const ALLOWED_ORIGINS = ['*'];

export function corsHeaders(origin: string | null): HeadersInit {
  const allow = ALLOWED_ORIGINS.includes('*')
    ? '*'
    : (origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);

  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req.headers.get('origin')) });
  }
  return null;
}

export function jsonResponse(
  body: unknown,
  init: ResponseInit & { req?: Request } = {}
): Response {
  const { req, ...rest } = init;
  return new Response(JSON.stringify(body), {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...corsHeaders(req?.headers.get('origin') ?? null),
      ...(rest.headers ?? {}),
    },
  });
}
