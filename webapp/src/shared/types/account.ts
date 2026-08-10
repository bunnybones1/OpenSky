import { PrismClass } from '@opensky/shared/constants'

import { Account as _Account, ItemType } from '~/lib/proto'

interface AccountBalanceTuple {
  locked: number
  owned: number
}

export interface FrameBalanceOverview {
  [ItemType.SW_SILVER_CARDS]: AccountBalanceTuple
  [ItemType.SW_GOLD_CARDS]: AccountBalanceTuple
  [ItemType.SW_BASE_CARDS]: AccountBalanceTuple
}
export interface FrameBalanceTotalOverview {
  [ItemType.SW_SILVER_CARDS]: number
  [ItemType.SW_GOLD_CARDS]: number
  [ItemType.SW_BASE_CARDS]: number
}

export interface PrismBalanceOverview {
  [PrismClass.AGY]: AccountBalanceTuple
  [PrismClass.HRT]: AccountBalanceTuple
  [PrismClass.INT]: AccountBalanceTuple
  [PrismClass.STR]: AccountBalanceTuple
  [PrismClass.WIS]: AccountBalanceTuple
}

export interface PrismAndFrameBalanceOverview {
  [PrismClass.AGY]: FrameBalanceOverview
  [PrismClass.HRT]: FrameBalanceOverview
  [PrismClass.INT]: FrameBalanceOverview
  [PrismClass.STR]: FrameBalanceOverview
  [PrismClass.WIS]: FrameBalanceOverview
}

export interface FormattedBalances {
  frameBalanceOverview: FrameBalanceOverview
  prismBalanceOverview: PrismBalanceOverview
  prismAndFrameBalanceOverview: PrismAndFrameBalanceOverview
  frameBalanceTotalOverview: FrameBalanceTotalOverview
}
