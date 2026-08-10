import {
  isAndroidNativeApp,
  isIOSNativeApp
} from '@opensky/shared/check-mobile-app-type'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Box, FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { HeightOneHundredVhMinusOffset } from '~/shared/style/TopOffsetStyle.css'

const MarketDisabled = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const isIOSNative = isIOSNativeApp()
  const isAndroidNative = isAndroidNativeApp()
  const navigate = useNavigate()

  const platformDisabled = isIOSNative || isAndroidNative
  return (
    <FlexBox
      className={HeightOneHundredVhMinusOffset}
      style={{
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        backgroundSize: 'cover',
        backgroundImage: !!getAssetUrl
          ? `url(${getAssetUrl('webapp/backgrounds/shop.webp')})`
          : undefined
      }}
    >
      <Text
        fontSize={['15px', '16px', '18px', '26px']}
        style={{
          fontFamily: 'Barlow Condensed',
          fontWeight: 600,
          color: '#C5B4F5',
          textAlign: 'center'
        }}
      >
        {platformDisabled && <>{t('market.platformUnavailable')}</>}
        {!platformDisabled && (
          <>
            {t('market.regionUnavailable')}
            <Text
              fontSize={['15px', '16px', '18px', '26px']}
              style={{
                fontFamily: 'Barlow Condensed',
                fontWeight: 600,
                color: '#C5B4F5'
              }}
            >
              {t('market.countryRestrictionsFound')}{' '}
              <a
                href="https://www.skyweaver.net/news/country-restrictions"
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#fff',
                  textDecoration: 'none'
                }}
              >
                {t('market.here')}
              </a>
              .
            </Text>
          </>
        )}
      </Text>
      <Box mt={'16px'}>
        <Button
          frameType="default"
          colorType="green"
          text={t('market.goBackToHome')}
          onClick={() => {
            navigate(ROUTES_CONFIG.directPath)
          }}
        />
      </Box>
    </FlexBox>
  )
})

export default MarketDisabled

MarketDisabled.displayName = 'MarketDisabled'
