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

const makeCompressedHashAndFilesizeFinder = (data: AssetsManifestTree) => {
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
        .map((x) => getKey(segments, x))
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

export interface IAssetHashManifest {
  getFullUrl: (url: string) => string
  getFilesize: (url: string) => number | string
}

export class AssetHashManifest implements IAssetHashManifest {
  private pathLookup: (path: string) => HashAndFilesize | 'hash-not-found'

  constructor(
    private _prefix: string,
    data: AssetsManifestTree
  ) {
    this.pathLookup = makeCompressedHashAndFilesizeFinder(data)
  }

  getFullUrl(url: string) {
    const res = this.pathLookup(url)
    if (res === 'hash-not-found') {
      return res
    }
    return `${this._prefix}/${res.hash}/${url}`
  }

  getFilesize(url: string) {
    const res = this.pathLookup(url)
    if (res === 'hash-not-found') {
      return res
    }
    return res.filesize
  }
}

export class AssetHashManifestBypass implements IAssetHashManifest {
  constructor(private _prefix: string) {
    //
  }

  getFullUrl(url: string) {
    return `${this._prefix}/${url}`
  }

  getFilesize(url: string) {
    void url
    return 10000
  }
}
