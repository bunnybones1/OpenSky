import { simpleGit } from 'simple-git'
import parseGitDiff, { AnyFileChange } from 'parse-git-diff'
import { SheetsDataType } from '../schema'
import { sheetsFolderPath } from './dataLocations'
import path from 'node:path'

const sg = simpleGit()

export async function getDataDiff(
  branch: 'origin/master' | 'origin/release',
  sheet?: keyof SheetsDataType
): Promise<AnyFileChange[]> {
  await sg.fetch(['--prune'])
  const diffResult = await sg.diff([
    '--no-renames',
    branch,
    ...(sheet ? ['--', path.join(sheetsFolderPath, sheet)] : [])
  ])
  return parseGitDiff(diffResult).files
}

type OldAndNewValues =
  | {
      old: string
      new: string
    }
  | {
      old: undefined
      new: string
    }
  | {
      old: string
      new: undefined
    }

export type FullDataDiff<K extends keyof SheetsDataType> = Partial<{
  [id: string]: Partial<{
    [T in keyof SheetsDataType[K][string]]: OldAndNewValues
  }>
}>

export async function getSheetDiffWithFullData(
  branch: 'origin/master' | 'origin/release',
  sheet: keyof SheetsDataType
): Promise<FullDataDiff<typeof sheet>> {
  const diff = await getDataDiff(branch, sheet)
  const changes: FullDataDiff<typeof sheet> = {}
  for (const item of diff) {
    if (item.type === 'RenamedFile') {
      throw new Error('Renamed files not supported... ')
    } else if (item.type === 'AddedFile') {
      const [id, key] = item.path.split(path.sep).slice(-2)
      const newFileContents = await sg.show([`HEAD:${item.path}`])

      const object: Record<string, OldAndNewValues> = changes[id] ?? {}
      changes[id] = object

      object[key] = {
        old: undefined,
        new: newFileContents
      }
    } else if (item.type === 'DeletedFile') {
      const [id, key] = item.path.split(path.sep).slice(-2)
      const oldFileContents = await sg.show([`${branch}:${item.path}`])

      const object: Record<string, OldAndNewValues> = changes[id] ?? {}
      changes[id] = object

      object[key] = {
        old: oldFileContents,
        new: undefined
      }
    } else if (item.type === 'ChangedFile') {
      const [id, key] = item.path.split(path.sep).slice(-2)
      const oldFileContents = await sg.show([`${branch}:${item.path}`])
      const newFileContents = await sg.show([`HEAD:${item.path}`])

      const object: Record<string, OldAndNewValues> = changes[id] ?? {}
      changes[id] = object

      object[key] = {
        old: oldFileContents,
        new: newFileContents
      }
    }
  }
  return changes
}
