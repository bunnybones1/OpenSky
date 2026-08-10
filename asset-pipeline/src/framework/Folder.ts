import * as fs from 'fs'
import * as path from 'path'

import { warn } from './logging'

interface FolderData {
  folders?: { [foldername: string]: FolderData }
  files?: { [filename: string]: string }
}

export default class Folder {
  static async loadFile(filePath: string): Promise<Folder> {
    return new Promise<Folder>(function (resolve, reject) {
      fs.readFile(filePath, function (err, dataBuffer) {
        let data: FolderData = {}
        if (err) {
          warn(err.message)
          warn('making blank structure instead.')
        } else {
          try {
            data = JSON.parse(dataBuffer.toString())
          } catch (e) {
            reject(e)
          }
        }
        resolve(new Folder(path.resolve(path.dirname(filePath), '..'), data))
      })
    }).catch((err) => {
      console.error('Fatal error in Folder:loadFile(' + filePath + ')')
      console.error(err)
      process.exit(1)
    })
  }

  folders = new Map<string, Folder>()
  files = new Map<string, string>()

  constructor(public path: string, data?: FolderData) {
    if (data) {
      this.load(data)
    }
  }

  storeHash(filePath: string, hash: string) {
    return this._storeHashInternal(this.getRelPathChunks(filePath), hash)
  }

  removeHash(filePath: string) {
    return this._removeHashInternal(this.getRelPathChunks(filePath))
  }

  _storeHashInternal(fileChunks: string[], hash: string) {
    const cursor = fileChunks.shift()!
    if (fileChunks.length > 0) {
      if (!this.folders.has(cursor)) {
        this.folders.set(cursor, new Folder(path.join(this.path, cursor)))
      }
      this.folders.get(cursor)!._storeHashInternal(fileChunks, hash)
    } else {
      this.files.set(cursor, hash)
    }
  }

  _removeHashInternal(fileChunks: string[]) {
    const cursor = fileChunks.shift()!
    if (fileChunks.length > 0) {
      if (this.folders.has(cursor)) {
        this.folders.get(cursor)!._removeHashInternal(fileChunks)
      }
    } else if (this.files.has(cursor)) {
      this.files.delete(cursor)
    }
  }

  getHash(filePath: string) {
    return this._getHashInternal(this.getRelPathChunks(filePath))
  }

  _getHashInternal(fileChunks: string[]) {
    const cursor = fileChunks.shift()!
    if (fileChunks.length > 0) {
      if (!this.folders.has(cursor)) {
        this.folders.set(cursor, new Folder(path.join(this.path, cursor)))
      }
      return this.folders.get(cursor)!._getHashInternal(fileChunks)
    } else {
      return this.files.get(cursor)
    }
  }

  getSimple() {
    const folders: any = {}
    for (const key of Array.from(this.folders.keys())) {
      folders[key] = this.folders.get(key)!.getSimple()
    }

    const files: any = {}
    for (const key of Array.from(this.files.keys())) {
      files[key] = this.files.get(key)
    }

    return {
      folders,
      files
    }
  }

  load(data: FolderData) {
    if (data.folders) {
      for (const folderName of Object.keys(data.folders)) {
        this.folders.set(
          folderName,
          new Folder(path.join(this.path, folderName), data.folders[folderName])
        )
      }
    }
    if (data.files) {
      for (const fileName of Object.keys(data.files)) {
        this.files.set(fileName, data.files[fileName])
      }
    }
  }

  async scan(callback: (folder: Folder, filePath: string) => Promise<void>) {
    for (const [, folder] of this.folders) {
      await folder.scan(callback)
    }

    for (const filename of this.files.keys()) {
      const filePath = path.join(this.path, filename)

      await callback(this, filePath)
    }
  }

  private getRelPathChunks(filePath: string) {
    return path.relative(this.path, filePath).split(path.sep)
  }
}
