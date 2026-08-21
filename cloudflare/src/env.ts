import type {
  ConquestV2RewardQueueMessage,
  ConquestV2RewardWorkflowParams
} from './conquest-v2-reward-orchestration'
import type {
  LeaderboardRewardQueueMessage,
  LeaderboardRewardWorkflowParams
} from './leaderboard-reward-orchestration'

export interface Env {
  ASSETS: Fetcher
  AUTH_DB: D1Database
  CLIENT_FEEDBACK?: R2Bucket
  SESSION_SIGNING_KEY: string
  SEQUENCE_API_HOST: string
  ALLOWED_ORIGINS: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  WALLET_RPC_URL_137?: string
  WALLET_INDEXER_URL_137?: string
  WALLET_INDEXER_ACCESS_KEY?: string
  WALLET_ASSET_CONTRACT_137?: string
  ONESIGNAL_APP_ID?: string
  ONESIGNAL_REST_API_KEY?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_SKYPASS_PRICE_ID?: string
  STRIPE_CONQUEST_TICKET_PRICE_ID?: string
  STRIPE_SUCCESS_URL?: string
  STRIPE_CANCEL_URL?: string
  SKYPASS_REWARDS_ALLOWED_ORIGINS?: string
  DISCORD_WIDGET_URL?: string
  TWITCH_CLIENT_ID?: string
  TWITCH_CLIENT_SECRET?: string
  TWITCH_GAME_ID?: string
  GOOGLE_PLAY_PACKAGE_NAME?: string
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?: string
  APPLE_APP_STORE_BUNDLE_ID?: string
  APPLE_APP_STORE_ISSUER_ID?: string
  APPLE_APP_STORE_KEY_ID?: string
  APPLE_APP_STORE_PRIVATE_KEY?: string
  SAMSUNG_IAP_PACKAGE_NAME?: string
  INTERNAL_AUTH_SECRET: string
  MATCHMAKER_POOLS: DurableObjectNamespace
  GAME_MATCHES: DurableObjectNamespace
  MATCH_SERVICE: Fetcher
  CONQUEST_V2_REWARD_WORKFLOW?: Workflow<ConquestV2RewardWorkflowParams>
  CONQUEST_V2_REWARD_QUEUE?: Queue<ConquestV2RewardQueueMessage>
  LEADERBOARD_REWARD_WORKFLOW?: Workflow<LeaderboardRewardWorkflowParams>
  LEADERBOARD_REWARD_QUEUE?: Queue<LeaderboardRewardQueueMessage>
  WORKER_VERSION: WorkerVersionMetadata
}
