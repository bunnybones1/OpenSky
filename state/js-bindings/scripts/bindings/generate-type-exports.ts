import { readFileSync } from 'fs'

// This regex matches every `export type` & `export {  } from ''` definition,
// but no `export function` or `export class` definitions.

const regex = /^\s*export ({\s.*(\n\s.+)*?\s.*} from '.*?'|type .*(\n\s.+)*?)(\n|;)\n/gm
const bindings = readFileSync(0, 'utf-8')
const matches = bindings.match(regex)
if (matches) {
  console.log(matches.join('\n'))
}
