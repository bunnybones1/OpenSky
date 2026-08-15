import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const structFields = body =>
  body
    ? [...body.matchAll(/^\s*(\w+)\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)].map(
        match => ({
          name: match[1],
          type: match[2].trim(),
          json: match[3].split(',')[0],
          omitEmpty: match[3].split(',').includes('omitempty')
        })
      )
    : []

const field = (name, type, json, omitEmpty = false) => ({
  name,
  type,
  json,
  omitEmpty
})

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

const bannerEnumNames = source => {
  const block = source.match(
    /type BannerType uint16\s+const \(([\s\S]*?)\n\)/
  )?.[1]
  return block
    ? [...block.matchAll(/^\s*BannerType_(\w+)\s+/gm)].map(match => match[1])
    : []
}

export const bannerWireErrors = (
  generatedSource,
  bannerStore,
  bannerWire,
  api,
  packageSource
) => {
  const errors = []
  const expected = [
    field('Order', 'uint32', 'order'),
    field('Type', '*BannerType', 'type'),
    field('Color', '*string', 'color'),
    field('Msg', 'string', 'msg'),
    field('Dismissable', 'bool', 'dismissable'),
    field('ID', 'int64', 'id'),
    field('Link', '*string', 'link', true),
    field('StartAt', '*time.Time', 'startAt', true),
    field('EndAt', '*time.Time', 'endAt', true)
  ]
  if (
    JSON.stringify(structFields(structBody(generatedSource, 'Banner'))) !==
    JSON.stringify(expected)
  ) {
    errors.push('source Banner JSON contract changed')
  }
  if (
    JSON.stringify(bannerEnumNames(generatedSource)) !==
    JSON.stringify(['INFO', 'WARNING', 'EMERGENCY'])
  ) {
    errors.push('source BannerType enum changed')
  }

  if (bannerStore.split('var banners []*proto.Banner').length - 1 !== 2) {
    errors.push('source banner nil-list construction changed')
  }
  for (const token of [
    'func (s *BannersStore) AllValidBanners()',
    'func (s *BannersStore) AllBanners()',
    ').All(&banners)'
  ]) {
    if (!bannerStore.includes(token)) {
      errors.push(`source banner list construction changed: ${token}`)
    }
  }

  const compactWire = bannerWire.replace(/\s+/g, ' ')
  for (const token of [
    'order: banner.order ?? 0',
    'type: banner.type ?? null',
    'color: banner.color ?? null',
    "msg: banner.msg ?? ''",
    'dismissable: banner.dismissable ?? false',
    'id: banner.id ?? 0',
    'banner.link == null ? {} : { link: banner.link }',
    'banner.startAt == null ? {} : { startAt: banner.startAt }',
    'banner.endAt == null ? {} : { endAt: banner.endAt }',
    'banners.length ? banners.map(sourceBannerWire) : null'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker banner wire is missing: ${token}`)
    }
  }

  if (!api.includes("from './banner-wire'")) {
    errors.push('main Worker lost the shared banner wire import')
  }
  const routeChecks = [
    ['GMListBanners', "case 'GMAddBanner':"],
    ['GetBanners', "case 'GetFeaturedStreamers':"]
  ]
  for (const [route, end] of routeChecks) {
    if (
      !section(api, `case '${route}':`, end).includes(
        'sourceNullableBannerListWire('
      )
    ) {
      errors.push(`${route} bypasses source banner response normalization`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:banner-wire'] !==
    'node --test ./utils/check-cloudflare-banner-wire.test.mjs && node ./utils/check-cloudflare-banner-wire.mjs'
  ) {
    errors.push('package scripts lost the banner wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:banner-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the banner wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/data/banners_store.go',
    'cloudflare/src/banner-wire.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = bannerWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Banner enum, required pointers, optional fields, and nil lists preserve generated Go JSON semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
