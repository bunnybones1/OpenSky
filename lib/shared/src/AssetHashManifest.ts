export interface AssetsManifestTree {
  radix: number
  dicts: {
    dirs: string[]
    exts: string[]
    segments: string[]
    filenames: string[]
  }
  encoded: { [dirext: string]: { [filename: string]: [string, string] } }
}

interface HashAndFilesize {
  hash: string
  filesize: number
}

/**
 * Used to pull down an asset's real URL from a manifest.
 * # Example
 * ```ts
 * const prefix = 'https://assets.skyweaver.net';
 * const ASSETS_MANIFEST_GAME_HASH = "57595abd04045637d2bfee8b22dc8f40";
 * const assetsURL = `${prefix}/asset-manifests/assets-manifest.webapp.tree.${ASSETS_MANIFEST_GAME_HASH}.json`;
 * const manifest: AssetsManifestTree = await fetch(assetsURL).then(r => r.json() as any);
 * const hasher = new AssetHashManifest(prefix, manifest);
 * const realPath = hasher.getFullUrl('webapp/cards/full-cards/6x/4021.webp')
 * const fileSize = hasher.getFilesize('webapp/cards/full-cards/6x/4021.webp')
 * console.log(realPath) // https://assets.skyweaver.net/I511NUzw/webapp/cards/full-cards/6x/4021.webp
 * ```
 */

function makeCompressedHashAndFilesizeFinder(data: AssetsManifestTree) {
  const { radix, dicts, encoded } = data
  const { dirs, exts, segments, filenames } = dicts

  const radixEncode = (intCode: number) => intCode.toString(radix)

  const splitPath = (path: string) => {
    const dirOffset = path.lastIndexOf('/')
    const extOffset = path.indexOf('.')
    const dir = path.substring(0, dirOffset).replace(/^\//, '')
    const ext = path.substring(extOffset + 1)
    const filename = path.substring(dirOffset + 1, extOffset)

    return [dir, filename, ext]
  }

  const getKey = (collection: string[], item: string) =>
    radixEncode(collection.indexOf(item))

  return (path: string) => {
    const [dir, filename, ext] = splitPath(path)

    const encodedDir = getKey(dirs, dir)
    const encodedExt = getKey(exts, ext)
    const encodedFilename = getKey(
      filenames,
      filename
        .split('-')
        .map(x => getKey(segments, x))
        .join('-')
    )

    const root = encoded[`${encodedDir}/${encodedExt}`]

    if (root && root[encodedFilename]) {
      const [hash, b64Filesize] = root[encodedFilename]
      const filesize = Number.parseInt(b64Filesize, 16)
      return { hash, filesize }
    }
    return 'hash-not-found'
  }
}

export type FileInfo = {
  fullUrl: string
  filesize: number
}
export default class AssetHashManifest {
  private pathLookup: (path: string) => HashAndFilesize | 'hash-not-found'

  constructor(protected _prefix: string, data: AssetsManifestTree) {
    this.pathLookup = makeCompressedHashAndFilesizeFinder(data)
  }

  getFullUrl(url: string) {
    const res = this.pathLookup(url)
    return `${this._prefix}/${res === 'hash-not-found' ? res : res.hash}/${url}`
  }

  getFileInfo(url: string): FileInfo | 'not-found' {
    const res = this.pathLookup(url)
    if (res === 'hash-not-found') {
      return 'not-found'
    }
    return {
      fullUrl: `${this._prefix}/${res.hash}/${url}`,
      filesize: res.filesize
    }
  }

  getFilesize(url: string) {
    const res = this.pathLookup(url)
    if (res === 'hash-not-found') {
      return 0
    }
    return res.filesize
  }
}

const dummyData: AssetsManifestTree = {
  radix: 16,
  dicts: {
    dirs: [],
    exts: [],
    segments: [],
    filenames: []
  },
  encoded: {}
}
export class DummyAssetHashManifest extends AssetHashManifest {
  constructor(prefix: string) {
    super(prefix, dummyData)
  }
  getFullUrl(url: string) {
    return `${this._prefix}/${url}`
  }

  getFilesize(url: string) {
    return 10000
  }
  getFileInfo(url: string): FileInfo | 'not-found' {
    return {
      fullUrl: this.getFullUrl(url),
      filesize: this.getFilesize(url)
    }
  }
}
