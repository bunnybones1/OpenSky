import { memo } from 'react'

import { Asset } from '~/shared/components/Asset'
import { FlexBox } from '~/shared/components/Base'

import { FeedItemGlow } from '../shared/components/FeedItemGlow'

interface Props {
  level: number
}

export const ConquestTreasure = memo(({ level }: Props) => {
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
          url={'webapp/icons/dai-coin.webp'}
          style={{ height: '75%', top: '15%', position: 'absolute', left: '13%' }}
        />
        <Asset
          url={`webapp/icons/conquest-treasure-${level}.webp`}
          style={{ height: '90%', top: '5%', position: 'absolute', right: '11%' }}
        />
      </FlexBox>
      <FeedItemGlow />
    </>
  )
})

ConquestTreasure.displayName = 'ConquestTreasure'
