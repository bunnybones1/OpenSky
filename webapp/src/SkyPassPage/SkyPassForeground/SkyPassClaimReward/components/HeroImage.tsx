import { memo, useMemo } from 'react'

import { Box } from '~/shared/components/Base'
import { MagicExplosionWrapper } from '~/shared/components/webgl/MagicExplosionWrapper'
import { isSafari } from '~/shared/helpers/is-safari'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

interface Props {
  unlockedDecks: boolean
  imgId: string
  deckName?: string
  explosionEffect: boolean
}

export const HeroImage = memo(
  ({ unlockedDecks, imgId, deckName, explosionEffect }: Props) => {
    const { getAssetUrl } = useGetAssetContext()

    const deckImage = useMemo(
      () =>
        unlockedDecks && (
          <Box
            height={[
              'calc(80vh - 50px)',
              'calc(80vh - 50px)',
              'calc(80vh - 50px)',
              'calc(80vh - 150px)',
              'calc(80vh - 150px)'
            ]}
            right={[5, 10, 15, 25, 25]}
            top={[5, 5, 25, 50, 75]}
            style={{
              position: 'absolute',
              userSelect: 'none',
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            <MagicExplosionWrapper
              explosionEffect={explosionEffect}
              explosionEffectVisibleStart={true}
              explosionEffectDelay={500}
              isReadyToAnimate={true}
            >
              {!!getAssetUrl && !!deckName && (
                <img
                  src={getAssetUrl(
                    `webapp/misc/deck-starter-${deckName.toLowerCase()}.webp`
                  )}
                  style={{
                    height: '100%',
                    width: isSafari() ? 'initial' : '100%'
                  }}
                />
              )}
            </MagicExplosionWrapper>
          </Box>
        ),
      [unlockedDecks, explosionEffect, getAssetUrl, deckName]
    )

    return (
      <>
        {deckImage}
        <Box
          height={[
            'calc(100vh - 50px)',
            'calc(100vh - 50px)',
            'calc(100vh - 100px)',
            'calc(100vh - 150px)',
            'calc(100vh - 150px)'
          ]}
          right={
            unlockedDecks ? [150, 150, 150, 250, 350] : [100, 125, 150, 150, 150]
          }
          top={[0, 0, 15, 25, 25]}
          style={{
            position: 'absolute',
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 2
          }}
        >
          <MagicExplosionWrapper
            explosionEffect={explosionEffect}
            explosionEffectVisibleStart={true}
            explosionEffectDelay={0}
            isReadyToAnimate={true}
          >
            {!!getAssetUrl && (
              <img
                src={getAssetUrl(`webapp/heroes/art/6x/${imgId}@6x.webp`)}
                style={{
                  height: '100%',
                  width: isSafari() ? 'initial' : '100%'
                }}
              />
            )}
          </MagicExplosionWrapper>
        </Box>
      </>
    )
  }
)

HeroImage.displayName = 'HeroImage'
