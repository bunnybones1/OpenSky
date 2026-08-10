import md5File from 'md5-file/promise'
import path from 'path'

// Caches md5 result of file to prevent multiple hashings of the same file
// Offers signifigant performance improvement as a single file is often used more than once

class _FileHashCache {
  private _cache: Map<string, string> = new Map()

  async get(filePath: string) {
    if (this._cache.has(path.resolve(filePath))) {
      return this._cache.get(path.resolve(filePath))
    } else {
      return this.set(path.resolve(filePath))
    }
  }

  async set(filePath: string) {
    const hash = await md5File(filePath)
    this._cache.set(path.resolve(filePath), hash)
    return hash
  }
}

const FileHashCache = new _FileHashCache()

export default FileHashCache
