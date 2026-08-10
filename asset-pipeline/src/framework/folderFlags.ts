import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'

const __cache = new Map<string, Map<string, boolean>>()

export async function doesFolderFlagExist(
  file: string,
  flag: string
): Promise<boolean> {
  const folder = path.dirname(path.resolve(file))
  if (!__cache.has(folder)) {
    __cache.set(folder, new Map())
  }
  const folderFlags = __cache.get(folder)!
  if (!folderFlags.has(flag)) {
    const flagFile = path.resolve(folder, '.' + flag)
    folderFlags.set(flag, await promisify(fs.exists)(flagFile))
  }
  return folderFlags.get(flag) ?? false
}
