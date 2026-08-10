import { memo } from 'react'

import { Asset } from '~/shared/components/Asset'
import { Box } from '~/shared/components/Base/Box'

export const FeedItemGlow = memo(() => (
  <Asset url="webapp/backgrounds/feed-glow.webp">
    {({ result }) => (
      <Box
        position="absolute"
        top={0}
        left={0}
        zIndex={1}
        width="100%"
        height="100%"
        opacity={0.8}
        style={{
          backgroundImage: `url(${result})`,
          backgroundPosition: 'center top 50%',
          backgroundSize: '140% 290%'
        }}
      />
    )}
  </Asset>
))

FeedItemGlow.displayName = 'FeedItemGlow'
