import { MONO_PRISM_CODES } from '@opensky/shared/constants'
import { uniq } from 'lodash-es'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useSnapshot } from 'valtio'

import { Text } from '~/__deprecated__/Text'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { CARD_ITEM_TYPES } from '~/shared/constants/cards'
import { makeItemsCardsRoute } from '~/shared/helpers/routes/items-page'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'
import { useMultiTypeTokenBalances } from '~/shared/queries/useTokenBalances'
import { authenticationState } from '~/shared/state/authentication-state'

import CollectionBadge from './components/CollectionBadge'

const CollectionStats = memo(() => {
  const { data: activeAccount } = useActiveAccount()
  const { userAddress } = useSnapshot(authenticationState)
  const { t } = useTranslation()

  const isExternalProfile =
    !!activeAccount && !!userAddress && activeAccount.address !== userAddress

  const cardBalances = useMultiTypeTokenBalances(CARD_ITEM_TYPES)

  const numUnlockedCards = useMemo(() => {
    if (!cardBalances || !cardBalances.length) return

    return uniq(cardBalances.map((balance) => balance.id) || []).length
  }, [cardBalances])

  return (
    <FlexBox width="100%" type="centered-start-column">
      <Link
        to={makeItemsCardsRoute()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: isExternalProfile || !numUnlockedCards ? 'none' : 'all'
        }}
      >
        <Text pr={2} fontSize={18} color="purple9" fontWeight="bold">
          {`${t('profile.COLLECTION')}:`}
        </Text>

        <Icon type="cards" height="20px" color="purple9" />

        <Text pl={1} fontSize={18} color="purple9" fontWeight="bold">
          {t('profile.collectionCount', {
            cardCount: numUnlockedCards || 0
          })}
        </Text>
      </Link>
      <FlexBox
        pt={30}
        width="100%"
        alignItems="center"
        justifyContent="space-between"
      >
        {MONO_PRISM_CODES.map((code) => (
          <CollectionBadge key={code} prismCode={code} />
        ))}
      </FlexBox>
    </FlexBox>
  )
})

CollectionStats.displayName = 'CollectionStats'

export default CollectionStats
