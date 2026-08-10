import { program } from 'commander'
import * as crypto from 'crypto'

import FileHashCache from './FileHashCache'
import Folder from './Folder'
import { log, warn } from './logging'
import { compose, existsAsync, localizeFileStrings } from './utils'

type CommandFunc = (context: CommandContext) => Promise<any>
type Command = string | CommandFunc

function assertNoUndefineds(files: string | string[]) {
  if (
    (files instanceof Array ? files : [files]).some((p) =>
      p.includes('undefined')
    )
  ) {
    throw new Error('path has "undefined" in it. That cannot be right.')
  }
}
class CommandBlock {
  static createContext(
    inputFiles: string | string[],
    outputFiles: string | string[],
    extra?: any
  ) {
    try {
      assertNoUndefineds(inputFiles)
      assertNoUndefineds(outputFiles)
    } catch (e) {
      throw new Error(
        `${e.message}\n inputs: ${inputFiles} outputs: ${outputFiles}`
      )
    }
    return new CommandContext(inputFiles, outputFiles, extra)
  }

  command: Command
  retries = 0

  private _commandHash: string | undefined

  constructor(
    public context: CommandContext,
    command: Command,
    readonly maxRetries = 3
  ) {
    if (typeof command === 'string') {
      command = localizeFileStrings(command)
    }
    this.command = command
  }

  async getCommandHash(): Promise<string> {
    let commandKey = ''

    if (this._commandHash === undefined) {
      const inputHashes = await this.context.calculateInputHashes()

      if (typeof this.command === 'string') {
        log(this.command, 4)
        const replaceInputFiles = (command: string) => {
          return this.context.inputFiles.reduce(
            (acc, x) => acc.split(x).join(inputHashes.get(x)),
            command
          )
        }

        const replaceOutputFiles = (command: string) => {
          return this.context.outputFiles.reduce(
            (acc, x) => acc.split(x).join('outPath'),
            command
          )
        }

        const replaceFiles = compose(replaceInputFiles, replaceOutputFiles)

        // command hash should replace the incoming file paths with the file md5,
        // since everyone will have different folder structures on their computers
        commandKey = replaceFiles(this.command)
        log(commandKey, 5)
      } else {
        commandKey = this.context.getKey()
        log(commandKey, 5)
      }

      const md5 = crypto.createHash('md5')
      this._commandHash = md5.update(commandKey).digest('hex')
    }

    return this._commandHash
  }

  async getOutputHashes() {
    return this.context.calculateOutputHashes()
  }

  async isUpToDate(commandHashCache: Folder, resultHashCache: Folder) {
    const commandHash = await this.getCommandHash()

    const outputFiles = await Promise.all(
      this.context.outputFiles.map((file) =>
        existsAsync(file).then((e) => [file, e] as const)
      )
    )

    if (outputFiles.some(([, exists]) => !exists)) {
      warnOrBail(
        `Must rerun ${this.command} because of missing outputs:\n${outputFiles
          .filter(([, exists]) => !exists)
          .map(([file]) => file)
          .join('\n')}`
      )
      return false
    }

    for (const file of this.context.outputFiles) {
      const hash = commandHashCache.getHash(file)
      if (hash !== commandHash) {
        warnOrBail(
          `Must rerun command because command/input hash for file is not up-to-date!
Cached hash
${hash}
!==
${commandHash}
Hash derived from current command/inputs
========
File:
    ${file}
Command:
    ${this.command}
Context:
${this.context.getKey()}

Input Files:
${this.context.inputFiles.join('\n')}
========`
        )
        return false
      }
    }

    const outputHashes = await this.getOutputHashes()
    const isResultHashesUpToDate = this.context.outputFiles.every(
      (outputFile) =>
        outputHashes.get(outputFile) === resultHashCache.getHash(outputFile)
    )
    if (!isResultHashesUpToDate) {
      this.context.outputFiles.forEach((outputFile) => {
        if (
          outputHashes.get(outputFile) !== resultHashCache.getHash(outputFile)
        ) {
          warnOrBail(
            `Must rerun command because output hash for file is not up-to-date!
  Cached hash
  ${resultHashCache.getHash(outputFile)}
  !==
  ${outputHashes.get(outputFile)}
  Hash derived from current command
  ========
  Output File:
      ${outputFile}
  Command:
      ${this.command}
  Context:
  ${this.context.getKey()}
  
  Input Files:
  ${this.context.inputFiles.join('\n')}
  ========`
          )
          warnOrBail(
            `${outputFile} ...${outputHashes.get(
              outputFile
            )} !== ${resultHashCache.getHash(outputFile)}`
          )
        }
      })
    }
    return isResultHashesUpToDate
  }

  async execute() {
    await this.context.calculateOutputHashes().catch((err) => {
      if (err instanceof Error) {
        throw new Error(
          `Error in CommandBlock ${this.command}:\n${err.message}\n${err.stack}`
        )
      }
      throw err
    })
  }

  retry(): boolean {
    return this.retries++ < this.maxRetries
  }
}

export default CommandBlock

export class CommandContext {
  inputFiles: string[]
  outputFiles: string[]
  extra: any

  inputHashes: Map<string, string> = new Map()
  outputHashes: Map<string, string> = new Map()

  constructor(
    inputFiles: string | string[],
    outputFiles: string | string[],
    extra?: any
  ) {
    this.inputFiles = ([] as string[])
      .concat(inputFiles)
      .filter(Boolean)
      .map(localizeFileStrings)
    this.outputFiles = ([] as string[])
      .concat(outputFiles)
      .filter(Boolean)
      .map(localizeFileStrings)
    this.extra = extra
  }

  get inputFile() {
    return this.inputFiles[0] || ''
  }

  get outputFile() {
    return this.outputFiles[0] || ''
  }

  getKey() {
    return (
      [...this.inputHashes.values()].join(' ') +
      (JSON.stringify(this.extra) || '')
    )
  }

  async calculateInputHashes() {
    for (const file of this.inputFiles) {
      if (await existsAsync(file)) {
        this.inputHashes.set(file, (await FileHashCache.get(file))!)
      } else {
        throw new Error(`Input file ${file} does not exist`)
      }
    }
    return this.inputHashes
  }

  async calculateOutputHashes() {
    for (const file of this.outputFiles) {
      if (!this.outputHashes.has(file)) {
        if (await existsAsync(file)) {
          this.outputHashes.set(file, await FileHashCache.set(file))
        } else {
          throw new Error(
            `Error while processing command context ${this.getKey()}:\n${
              this.inputFiles
            }\n${
              this.outputFiles
            }: \nOutput file ${file} was not created by command.`
          )
        }
      }
    }
    return this.outputHashes
  }
}
function warnOrBail(message: string) {
  if (program.opts().check) {
    throw new Error(message)
  } else {
    warn(message, 4)
  }
}
