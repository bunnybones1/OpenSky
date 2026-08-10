import * as fs from 'fs'

export async function loadJson(filePath: string): Promise<any> {
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, function (err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(JSON.parse(data.toString()))
      }
    })
  })
}
