import { noop } from 'lodash-es'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Text } from '~/__deprecated__/Text'
import { Asset } from '~/shared/components/Asset'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Button } from '~/shared/components/Button'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useIsExternalProfile } from '~/shared/hooks/useIsExternalProfile'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

export const EmptyFeed = memo(() => {
  const isExternalProfile = useIsExternalProfile()
  const { t } = useTranslation()
  return (
    <FlexBox
      width="100%"
      height={[180, 180, 200, 250]}
      mt={[20, 20, 40]}
      type="centered-column"
      position="relative"
    >
      <FlexBox
        type="centered-column"
        height="100%"
        width="100%"
        position="absolute"
        zIndex={2}
        top={0}
        left={0}
      >
        <Text pb={3} color="white" fontSize={26} fontFamily="condensed">
          {t(`profile.noActivity${isExternalProfile ? 'External' : ''}`)}
        </Text>
        {!isExternalProfile && (
          <>
            <Text
              width={339}
              textWrap={true}
              fontSize={3}
              color="purple9"
              textAlign="center"
              pb={6}
            >
              {t('deckBuilder.noUnlockedDesc')}
            </Text>
            <Link to={ROUTES_CONFIG.directPath}>
              <Button
                frameType="default"
                colorType="green"
                text={t('play.play')}
                onClick={noop}
                height={'52px'}
                width="full"
                buttonClassName={Sprinkles({
                  paddingX: '32px'
                })}
              />
            </Link>
          </>
        )}
      </FlexBox>
      <FlexBox
        width="auto"
        height="100%"
        type="centered-row"
        position="absolute"
        zIndex={1}
        bottom={0}
        left="50%"
        transform="translateX(-50%)"
      >
        <Asset style={{ height: '100%' }} url="webapp/backgrounds/no-owned.webp" />
      </FlexBox>
    </FlexBox>
  )
})

EmptyFeed.displayName = 'EmptyFeed'
