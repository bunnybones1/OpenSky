import * as dotenv from 'dotenv'
import * as path from 'path'

export type EthereumNetworksTypes =
  | 'rinkeby'
  | 'ropsten'
  | 'kovan'
  | 'goerli'
  | 'mainnet'
  | 'mumbai'
  | 'matic'

export const getEnvConfig = () => {
  const envFile = path.resolve(__dirname, `../config/creds.env`)
  const envLoad = dotenv.config({ path: envFile })

  if (envLoad.error) {
    throw new Error(envLoad.error.message)
  }

  return envLoad.parsed || {}
}
