import { opendir, readFile } from 'node:fs/promises'
import path from 'node:path'

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const d of await opendir(dir)) {
    const entry = path.join(dir, d.name)
    if (d.name.startsWith('.')) continue
    if (d.isDirectory()) yield* await walk(entry)
    else if (d.isFile()) yield entry
  }
}

export async function filesystemToJSON(rootFolder: string): Promise<object> {
  const allReadPromises: any[] = []
  const rootFolderDepth = rootFolder.split(path.sep).length
  const json: Record<string, any> = {}
  for await (const file of walk(rootFolder)) {
    const parts = file.split(path.sep).slice(rootFolderDepth)
    let obj = json
    for (const part of parts) {
      if (part === parts[parts.length - 1]) {
        allReadPromises.push(
          readFile(file, 'utf8')
            .then(f => (obj[part] = JSON.parse(f)))
            .catch(err => {
              throw new Error(`Error parsing ${file}: ${err}`)
            })
        )
      } else {
        obj[part] = obj[part] || {}
        obj = obj[part]
      }
    }
  }
  await Promise.all(allReadPromises)
  return json
}
