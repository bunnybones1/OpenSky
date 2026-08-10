import { PrismClass } from '@opensky/shared/constants'

import { CardOwnershipResponse, ItemType } from '~/lib/proto'
import {
  FrameBalanceOverview,
  PrismAndFrameBalanceOverview,
  PrismBalanceOverview
} from '~/shared/types/account'

import { FormattedBalances } from '../../types/account'

export const formatAccountBalances = (
  res?: CardOwnershipResponse
): FormattedBalances | undefined => {
  if (!res) return undefined

  const {
    lockedCardsByClass,
    lockedCardsByFrame,
    unlockedCardsByClass,
    unlockedCardsByFrame,
    lockedCardsByClassAndFrame,
    unlockedCardsByClassAndFrame,
    cardBalances
  } = res

  const prismBalanceOverview: PrismBalanceOverview = {
    [PrismClass.WIS]: {
      locked: lockedCardsByClass.WIS,
      owned: unlockedCardsByClass.WIS
    },
    [PrismClass.STR]: {
      locked: lockedCardsByClass.STR,
      owned: unlockedCardsByClass.STR
    },
    [PrismClass.INT]: {
      locked: lockedCardsByClass.INT,
      owned: unlockedCardsByClass.INT
    },
    [PrismClass.HRT]: {
      locked: lockedCardsByClass.HRT,
      owned: unlockedCardsByClass.HRT
    },
    [PrismClass.AGY]: {
      locked: lockedCardsByClass.AGY,
      owned: unlockedCardsByClass.AGY
    }
  }

  const frameBalanceOverview: FrameBalanceOverview = {
    [ItemType.SW_BASE_CARDS]: {
      locked: lockedCardsByFrame[ItemType.SW_BASE_CARDS],
      owned: unlockedCardsByFrame[ItemType.SW_BASE_CARDS]
    },
    [ItemType.SW_GOLD_CARDS]: {
      locked: lockedCardsByFrame[ItemType.SW_GOLD_CARDS],
      owned: unlockedCardsByFrame[ItemType.SW_GOLD_CARDS]
    },
    [ItemType.SW_SILVER_CARDS]: {
      locked: lockedCardsByFrame[ItemType.SW_SILVER_CARDS],
      owned: unlockedCardsByFrame[ItemType.SW_SILVER_CARDS]
    }
  }

  const prismAndFrameBalanceOverview: PrismAndFrameBalanceOverview = {
    [PrismClass.WIS]: {
      [ItemType.SW_BASE_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.WIS][ItemType.SW_BASE_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.WIS][ItemType.SW_BASE_CARDS]
      },
      [ItemType.SW_GOLD_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.WIS][ItemType.SW_GOLD_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.WIS][ItemType.SW_GOLD_CARDS]
      },
      [ItemType.SW_SILVER_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.WIS][ItemType.SW_SILVER_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.WIS][ItemType.SW_SILVER_CARDS]
      }
    },
    [PrismClass.STR]: {
      [ItemType.SW_BASE_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.STR][ItemType.SW_BASE_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.STR][ItemType.SW_BASE_CARDS]
      },
      [ItemType.SW_GOLD_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.STR][ItemType.SW_GOLD_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.STR][ItemType.SW_GOLD_CARDS]
      },
      [ItemType.SW_SILVER_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.STR][ItemType.SW_SILVER_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.STR][ItemType.SW_SILVER_CARDS]
      }
    },
    [PrismClass.INT]: {
      [ItemType.SW_BASE_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.INT][ItemType.SW_BASE_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.INT][ItemType.SW_BASE_CARDS]
      },
      [ItemType.SW_GOLD_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.INT][ItemType.SW_GOLD_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.INT][ItemType.SW_GOLD_CARDS]
      },
      [ItemType.SW_SILVER_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.INT][ItemType.SW_SILVER_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.INT][ItemType.SW_SILVER_CARDS]
      }
    },
    [PrismClass.HRT]: {
      [ItemType.SW_BASE_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.HRT][ItemType.SW_BASE_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.HRT][ItemType.SW_BASE_CARDS]
      },
      [ItemType.SW_GOLD_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.HRT][ItemType.SW_GOLD_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.HRT][ItemType.SW_GOLD_CARDS]
      },
      [ItemType.SW_SILVER_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.HRT][ItemType.SW_SILVER_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.HRT][ItemType.SW_SILVER_CARDS]
      }
    },
    [PrismClass.AGY]: {
      [ItemType.SW_BASE_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.AGY][ItemType.SW_BASE_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.AGY][ItemType.SW_BASE_CARDS]
      },
      [ItemType.SW_GOLD_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.AGY][ItemType.SW_GOLD_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.AGY][ItemType.SW_GOLD_CARDS]
      },
      [ItemType.SW_SILVER_CARDS]: {
        locked: lockedCardsByClassAndFrame[PrismClass.AGY][ItemType.SW_SILVER_CARDS],
        owned: unlockedCardsByClassAndFrame[PrismClass.AGY][ItemType.SW_SILVER_CARDS]
      }
    }
  }

  const frameBalanceTotalOverview = {
    [ItemType.SW_BASE_CARDS]: 0,
    [ItemType.SW_SILVER_CARDS]: 0,
    [ItemType.SW_GOLD_CARDS]: 0
  }
  Object.keys(cardBalances).forEach((id) => {
    if (cardBalances[id][ItemType.SW_BASE_CARDS].balance > 0) {
      frameBalanceTotalOverview[ItemType.SW_BASE_CARDS] =
        frameBalanceTotalOverview[ItemType.SW_BASE_CARDS] +
        +cardBalances[id][ItemType.SW_BASE_CARDS].balance
    }
    if (cardBalances[id][ItemType.SW_SILVER_CARDS].balance > 0) {
      frameBalanceTotalOverview[ItemType.SW_SILVER_CARDS] =
        frameBalanceTotalOverview[ItemType.SW_SILVER_CARDS] +
        +cardBalances[id][ItemType.SW_SILVER_CARDS].balance
    }
    if (cardBalances[id][ItemType.SW_GOLD_CARDS].balance > 0) {
      frameBalanceTotalOverview[ItemType.SW_GOLD_CARDS] =
        frameBalanceTotalOverview[ItemType.SW_GOLD_CARDS] +
        +cardBalances[id][ItemType.SW_GOLD_CARDS].balance
    }
  })

  return {
    frameBalanceOverview,
    prismBalanceOverview,
    prismAndFrameBalanceOverview,
    frameBalanceTotalOverview
  }
}
