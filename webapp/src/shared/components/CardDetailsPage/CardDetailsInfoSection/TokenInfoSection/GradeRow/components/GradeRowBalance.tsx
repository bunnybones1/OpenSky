import { ItemType } from '@opensky/proto'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Cards } from '~/shared/constants/cards'
import { useBalancesForCard } from '~/shared/hooks/cards/useBalancesForCard'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface GradeRowBalanceProps {
  id: number
  grade: ItemType.SW_BASE_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
}

export const GradeRowBalance = memo(({ id, grade }: GradeRowBalanceProps) => {
  const card = useMemo(() => Cards.get(id), [id])

  const isEnchant = card?.type === 'enchant'
  const isToken = card?.prism === 'tok' && !isEnchant

  const { t } = useTranslation()

  const cardBalances = useBalancesForCard(id)

  const ownershipText = useMemo(() => {
    if (cardBalances === undefined) return undefined
    if (isEnchant || isToken || (!cardBalances && grade !== ItemType.SW_BASE_CARDS))
      return t('generic.NotApplicable')

    if (grade === ItemType.SW_BASE_CARDS) {
      if (
        cardBalances?.find(
          (balance) =>
            balance.itemType === ItemType.SW_BASE_CARDS && balance.balance > 0
        )
      ) {
        return t('generic.Unlocked')
      } else {
        return t('generic.Locked')
      }
    }
    return cardBalances?.find((balance) => balance.itemType === grade)?.balance || '0'
  }, [cardBalances, grade, isEnchant, isToken, t])

  const balance = useMemo(() => {
    if (!cardBalances) return cardBalances
    return cardBalances.find((balance) => balance.itemType === grade)?.balance || 0
  }, [cardBalances, grade])

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      })}
    >
      {balance === undefined ? (
        <Icon type="spinner" height="14px" color="purple9" />
      ) : (
        <Text fontSize="14px" color="purple9">
          {ownershipText}
        </Text>
      )}
    </div>
  )
})

GradeRowBalance.displayName = 'GradeRowBalance'
