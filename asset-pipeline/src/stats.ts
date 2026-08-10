// import { program } from 'commander'
import * as fs from 'fs'
import * as path from 'path'

import { webappAssetsPath } from './config'

const files: string[] = []

const getFilesRecursively = (directory: string) => {
  const filesInDirectory = fs.readdirSync(directory)
  for (const file of filesInDirectory) {
    const absolute = path.join(directory, file)
    if (fs.statSync(absolute).isDirectory()) {
      getFilesRecursively(absolute)
    } else {
      const extName = path.extname(absolute)
      if (!!extName) {
        files.push(absolute)
      }
    }
  }
}

const getFiles = () => {
  getFilesRecursively(webappAssetsPath)

  if (!!files.length) {
    const filesWithSizes = files
      .map((filePath) => {
        const fileSizeInBytes = fs.statSync(filePath).size
        return {
          filePath,
          size: fileSizeInBytes / (1024 * 1024)
        }
      })
      .filter(({ size, filePath }) => size > 0.1 && !filePath.includes('fonts'))
      .sort((a, b) => b.size - a.size)

    console.log(`Found ${filesWithSizes.length} assets larger than 500kb`)
    console.log('Here are the top 20: ')
    filesWithSizes.forEach((fileInfo, i) => {
      if (i <= 19) {
        console.log(fileInfo)
      }
    })
  }
}

getFiles()
