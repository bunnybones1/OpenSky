import { noop } from 'lodash-es'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Text } from '~/__deprecated__/Text'
import { Asset } from '~/shared/components/Asset'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Button } from '~/shared/components/Button'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { NAVBAR_WIDTH } from '~/shared/constants/ui'

import { FourOhFourPageStyle } from './FourOhFourPage.css'

const FourOhFourPage = memo(() => {
  const { t } = useTranslation()

  return (
    <FlexBox
      pl={[NAVBAR_WIDTH, NAVBAR_WIDTH, NAVBAR_WIDTH, 0]}
      className={FourOhFourPageStyle}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
      type="centered-start-column"
    >
      <FlexBox
        style={{
          width: '70%',
          maxWidth: '900px'
        }}
        type="centered-row"
      >
        <Asset
          url="webapp/backgrounds/404.webp"
          style={{
            width: '100%'
          }}
        />
      </FlexBox>
      <Text
        color="purple9"
        fontSize={[18, 18, 28]}
        fontWeight="medium"
        pt={2}
        pb={16}
        fontFamily="condensed"
      >
        {t('dashboard.404')}
      </Text>
      <Link to={ROUTES_CONFIG.directPath}>
        <Button
          frameType="default"
          colorType="green"
          text={t('dashboard.404Button')}
          onClick={noop}
        />
      </Link>
    </FlexBox>
  )
})

export default FourOhFourPage

FourOhFourPage.displayName = 'FourOhFourPage'
