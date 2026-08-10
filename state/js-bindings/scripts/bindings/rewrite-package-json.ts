import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const [_, __, type] = process.argv
if (!(type === 'browser' || type === 'node' || type === 'metadata')) {
  console.error("Expected argument 'browser' or 'node' or 'metadata'")
  process.exit(1)
}

const packageFilePath = join(__dirname, `../../packages/${type}-sys/package.json`)

const packageFile = JSON.parse(
  readFileSync(packageFilePath).toString()
)

packageFile.name = `@skyweaver/state-${type}-sys`
packageFile.types = "bindings.d.ts"
packageFile.main = 'bindings.js'
packageFile.module = 'bindings.js'
delete packageFile.files
writeFileSync(
  packageFilePath,
  JSON.stringify(packageFile, null, 2)
)
