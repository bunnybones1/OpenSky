import { memo } from 'react'

import { Asset } from '~/shared/components/Asset'
import { FlexBox } from '~/shared/components/Base/FlexBox'

import { FeedItemGlow } from '../shared/components/FeedItemGlow'

export const TicketsGained = memo(() => {
  return (
    <>
      <FlexBox
        height="100%"
        width="100%"
        justifyContent="center"
        overflow="hidden"
        position="absolute"
        top={0}
        left={0}
        zIndex={2}
      >
        <Asset
          url={'webapp/icons/conquest-ticket-big.webp'}
          style={{ height: '90%', top: '5%', position: 'relative' }}
        />
      </FlexBox>
      <FeedItemGlow />
    </>
  )
})

TicketsGained.displayName = 'TicketsGained'
