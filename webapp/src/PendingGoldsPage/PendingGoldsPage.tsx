import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/__deprecated__/Text'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { StandardGrid } from '~/shared/components/StandardGrid'
import { NAVBAR_WIDTH } from '~/shared/constants/ui'
import { usePendingCards } from '~/shared/queries/cards/usePendingCards'

import { PendingGoldCard } from './components/PendingGoldCard'
import PendingGoldsHeader from './components/PendingGoldsHeader'
import { PendingGoldsPageStyle } from './PendingGoldsPage.css'

const PendingGoldCardsPage = memo(() => {
  const { t } = useTranslation()

  const { data: pendingCards, isLoading } = usePendingCards()

  return (
    <FlexBox
      style={{
        width: '100%',
        height: 'auto'
      }}
      bg="purple1"
      type="start-column"
      position="relative"
      pl={[NAVBAR_WIDTH, NAVBAR_WIDTH, NAVBAR_WIDTH, 0]}
      className={PendingGoldsPageStyle}
    >
      <PendingGoldsHeader />
      <FlexBox
        width="100%"
        type="start-row"
        height="auto"
        px={[3, 4, 4, 5]}
        pb={[4, 5]}
      >
        {isLoading && (
          <FlexBox width="100%" justifyContent="center">
            <Icon type="spinner" height="24px" color="warm6" />
          </FlexBox>
        )}

        {!pendingCards && (
          <FlexBox width="100%" justifyContent="center">
            <Text
              color="warm6"
              style={{
                position: 'relative',
                marginTop: '8px',
                lineHeight: '20px'
              }}
              fontSize={['18px']}
              textAlign="center"
              fontWeight="500"
            >
              {t('play.noDeliveriesPending')}
            </Text>
          </FlexBox>
        )}
        <StandardGrid>
          {pendingCards &&
            pendingCards.length > 0 &&
            pendingCards.map((pendingGroup, groupIndex) =>
              pendingGroup.tokenIDs.map((tokenId) => {
                return (
                  <PendingGoldCard
                    id={tokenId}
                    key={`${groupIndex}-${tokenId}`}
                    deliverAt={pendingGroup.mintAt}
                  />
                )
              })
            )}
        </StandardGrid>
      </FlexBox>
    </FlexBox>
  )
})

export default PendingGoldCardsPage

PendingGoldCardsPage.displayName = 'PendingGoldCardsPage'
