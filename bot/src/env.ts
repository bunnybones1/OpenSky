import { program } from 'commander'
import { readFileSync } from 'fs'
import path from 'path'

interface Environment {
  MATCHMAKER_URL: string
  GITCOMMIT: string
  AUTH_CHAIN_URL: string
  SKYWEAVER_API_URL: string
}

const data = readFileSync(
  path.resolve(`config/bot.${program.opts().environment}.json`)
)
const env: Environment = JSON.parse(data.toString())

console.log(env)

export default env
