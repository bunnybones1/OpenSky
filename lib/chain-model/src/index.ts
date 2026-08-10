export interface ContractSchema {
  contractName: string
  address: string
}

export interface BalanceSummary {
  address: string
  balances: Array<Balance>
  migrationSuccess: boolean
}

export interface Balance {
  id: number
  amount: number
}

export enum FeatureTypes {
  BALANCES = 'BALANCES',
  MINT_TOKENS = 'MINT_TOKENS',
  DISTRIBUTE_TOKENS = 'DISTRIBUTE_TOKENS',
  NIFTYSWAP = 'NIFTYSWAP',
  CONQUEST = 'CONQUEST'
}

export enum ContractTypes {
  SKYWEAVER_CARDS = 'SKYWEAVER_CARDS',
  SKYWEAVER_CONQUEST_TICKETS = 'SKYWEAVER_CONQUEST_TICKETS',
  SKYWEAVER_CRYSTALS = 'SKYWEAVER_CRYSTALS',
  SKYWEAVER_STICKERS = 'SKYWEAVER_STICKERS',
  WRAPPED_DAI = 'WRAPPED_DAI',
  MOCK_DAI = 'MOCK_DAI',
  LEGACY_HEROES = 'LEGACY_HEROES',
  CARD_BACKS = "CARD_BACKS"
}

export enum DistributionTypes {
  RAFFLE = 'RAFFLE',
  DISTRIBUTION = 'DISTRIBUTION'
}

export enum AssetQueryTypes {
  USDC = 'USDC',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  CRYSTAL = 'CRYSTAL',
  TOKEN_ID = 'TOKEN_ID',
  CONQUEST_TICKET = 'CONQUEST_TICKET'
}

export enum EnvTypes {
  LOCAL = 'LOCAL',
  DEVELOPMENT = 'DEVELOPMENT',
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION'
}

export enum NetworkTypes {
  GANACHE = 'ganache',
  RINKEBY = 'rinkeby',
  MUMBAI = 'mumbai',
  KOVAN = 'kovan',
  MATIC = 'matic'
}

export enum NiftyswapManagerMode {
  REMOVE_SILVER = 'REMOVE_SILVER',
  REMOVE_GOLD = 'REMOVE_GOLD',
  ADD_SILVER = 'ADD_SILVER',
  ADD_GOLD = 'ADD_GOLD',
  ADD_STICKER = 'ADD_STICKER',
  ADD_HEROES = 'ADD_HEROES',
  ADD_WEEKLY_GOLD = 'ADD_WEEKLY_GOLD',
  EXPORT = 'EXPORT'
}

export enum ConquestManagerMode {
  CHECK_STATUS = 'CHECK_STATUS',
  FORCE_EXIT = 'FORCE_EXIT'
}

export enum AssetMigratorMode {
  CARDS = 'CARDS',
  COINS = 'COINS'
}

export type OwnerTypes = 'EOA' | 'MULTISIG'
