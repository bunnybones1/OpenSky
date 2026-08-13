import { describe, expect, it } from 'vitest'

import { applyAssetCachePolicy } from '../src/asset-cache'

const response = (contentType: string, cacheControl?: string) =>
  new Response('asset', {
    headers: {
      'Content-Type': contentType,
      ...(cacheControl ? { 'Cache-Control': cacheControl } : {})
    }
  })

describe('static asset release cache policy', () => {
  it('prevents the SPA shell from surviving a Worker release', async () => {
    const original = response('text/html; charset=utf-8', 'public, max-age=60')
    const guarded = applyAssetCachePolicy(
      new Request('https://cloud-weasel.example/market/heroes'),
      original
    )

    expect(guarded.headers.get('Cache-Control')).toBe('no-store')
    expect(guarded.headers.get('Cloudflare-CDN-Cache-Control')).toBe('no-store')
    expect(await guarded.text()).toBe('asset')
    expect(original.headers.get('Cache-Control')).toBe('public, max-age=60')
  })

  it('caches fingerprinted Vite assets immutably', () => {
    const guarded = applyAssetCachePolicy(
      new Request(
        'https://cloud-weasel.example/assets/index-2e8eccd1.js?release=current'
      ),
      response('text/javascript')
    )

    expect(guarded.headers.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable'
    )
    expect(guarded.headers.get('Cloudflare-CDN-Cache-Control')).toBe(
      'public, max-age=31536000, immutable'
    )
  })

  it('recognizes fingerprinted game assets and source maps', () => {
    const guarded = applyAssetCachePolicy(
      new Request(
        'https://cloud-weasel.example/game/cloudflare/assets/index-d81358f4.js.map'
      ),
      response('application/json')
    )

    expect(guarded.headers.get('Cache-Control')).toContain('immutable')
  })

  it('leaves unhashed assets on the platform revalidation policy', () => {
    const original = response(
      'application/javascript',
      'public, max-age=0, must-revalidate'
    )

    expect(
      applyAssetCachePolicy(
        new Request('https://cloud-weasel.example/service-worker.js'),
        original
      )
    ).toBe(original)
  })
})
