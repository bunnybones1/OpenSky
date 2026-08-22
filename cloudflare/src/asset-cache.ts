const FINGERPRINTED_ASSET = /-[a-f0-9]{8}(?:\.[^/]+)+$/

const withCacheControl = (response: Response, value: string) => {
  const guarded = new Response(response.body, response)
  guarded.headers.set('Cache-Control', value)
  guarded.headers.set('Cloudflare-CDN-Cache-Control', value)
  return guarded
}

export const applyAssetCachePolicy = (
  request: Request,
  response: Response
): Response => {
  const contentType = response.headers.get('Content-Type') || ''
  if (contentType.toLowerCase().startsWith('text/html')) {
    return withCacheControl(response, 'no-store')
  }

  const path = new URL(request.url).pathname
  if (path.startsWith('/locales/')) {
    return withCacheControl(response, 'no-store')
  }
  if (path.includes('/assets/') && FINGERPRINTED_ASSET.test(path)) {
    return withCacheControl(response, 'public, max-age=31536000, immutable')
  }

  return response
}
