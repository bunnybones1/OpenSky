import { exec } from 'child_process'
import { exists, readFile, writeFile } from 'fs'
import glob from 'glob'
import { mkdir } from 'node:fs/promises'
import * as path from 'path'
import { promisify } from 'util'

import { rootProjectsPath } from '../config'
import { error, log } from './logging'

export async function delay(ms: number) {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(undefined)
    }, ms)
  )
}

export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  return keys.reduce<Pick<T, K>>((acc, x) => {
    acc[x] = obj[x]
    return acc
  }, {} as Pick<T, K>)
}

export async function ensureFolder(dirPath: string) {
  await mkdir(path.resolve(dirPath), { recursive: true })
  return dirPath
}

export function localizeFileStrings(str: string) {
  return str.split(rootProjectsPath).join(`..${path.sep}..`)
}

export async function lookForMissingFiles(
  allSourceImages: string[]
): Promise<string[] | void> {
  const missingFiles: string[] = []
  await Promise.all(
    allSourceImages.map(
      (f) =>
        new Promise<boolean>((resolve, reject) => {
          log(`checking for existense of: ${f}`, 4)
          exists(f, (val) => {
            if (!val) {
              error(`missing file: ${f}`)
              missingFiles.push(f)
            }
            resolve(val)
          })
        })
    )
  )

  if (missingFiles.length > 0) {
    return missingFiles
  } else {
    return undefined
  }
}

export const readFileAsync = promisify(readFile)

export const writeFileAsync = promisify(writeFile)

export const execAsync = promisify(exec)
const globAsyncInternal = promisify(glob)

export const globAsync = async (
  pattern: string,
  options?: glob.IOptions
): Promise<string[]> => {
  const paths = await globAsyncInternal(pattern, options)
  return paths.map((s) => path.resolve(s))
}

export const existsAsync = promisify(exists)

export const compose = <R>(fn1: (a: R) => R, ...fns: Array<(a: R) => R>) =>
  fns.reduce((prevFn, nextFn) => (value) => prevFn(nextFn(value)), fn1)

const opaquePatterns = ['game-pieces-physical']
export function isForcedOpaque(file: string) {
  for (const pattern of opaquePatterns) {
    if (file.includes(pattern)) {
      return true
    }
  }
  return false
}

export async function promiseAllWithLimit<T>(
  queue: Array<() => Promise<T>>,
  concurrency: number
): Promise<Array<T>> {
  let queueCurrentIndex = 0
  const results: T[] = []

  async function execThread() {
    while (queueCurrentIndex < queue.length) {
      const thisThreadIndex = queueCurrentIndex++
      results[thisThreadIndex] = await queue[thisThreadIndex]()
    }
  }

  // Start threads
  const threads: Array<Promise<void>> = []
  for (let thread = 0; thread < concurrency; thread++) {
    threads.push(execThread())
  }
  await Promise.all(threads)
  return results
}
