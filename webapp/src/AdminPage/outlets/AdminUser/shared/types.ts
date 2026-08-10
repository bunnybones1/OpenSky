import {
  Account,
  GMAccountSignalSummariesReturn,
  GMIsAccountBannedReturn
} from '~/lib/proto'

export type UserAccount = {
  account: Account
  banStatus: GMIsAccountBannedReturn
  score: GMAccountSignalSummariesReturn
}
