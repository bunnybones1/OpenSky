import { isVersionGreaterThan } from '@opensky/shared/helpers'
import {
  isNativeOpenSkyMobileApp,
  nativeOpenSkyMobileVersion
} from '@opensky/shared/native'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import CheckBox from '~/__deprecated__/Checkbox'
import { MobileClient } from '~/shared/clients'
import { FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { mobileState } from '~/shared/state/mobile-state'

const shouldShow =
  isNativeOpenSkyMobileApp() &&
  isVersionGreaterThan(String(nativeOpenSkyMobileVersion()), '2.5.3')

export const MobileSettings = memo(() => {
  const { t } = useTranslation()

  const { pushEnabledAtDeviceLevel, mobilePushNotificationsEnabled } =
    useSnapshot(mobileState)

  if (!shouldShow) return null

  return (
    <FlexBox pt={32} width="100%" type="centered-column">
      <Text fontSize={18} color="purple9" fontWeight="bold">
        {t('general.notifications')}
      </Text>
      <FlexBox
        style={{
          marginTop: '10px',
          marginBottom: '20px',
          zIndex: 5
        }}
      >
        <CheckBox
          checked={mobilePushNotificationsEnabled}
          onClick={MobileClient.toggleNotifications}
        />
        <FlexBox
          style={{
            color: 'white',
            marginLeft: '10px',
            marginTop: '4px'
          }}
        >
          {t('general.allowPushNotifications')}
        </FlexBox>
      </FlexBox>
      <FlexBox width="100%" type="centered-column" pb={6}>
        {pushEnabledAtDeviceLevel === false && (
          <FlexBox type="centered-row">
            <Button
              frameType="default"
              colorType="default"
              onClick={MobileClient.openDeviceSettings}
              text={t('general.openDeviceSettings')}
              data-id="openSettingsButton"
            />
            <FlexBox px={1} type="centered-row" margin={2}>
              <Tooltip placement="top" tooltip={t('tooltip.allowNotifications')}>
                <Icon type="info-empty" color="purple9" height="14px" />
              </Tooltip>
            </FlexBox>
          </FlexBox>
        )}
      </FlexBox>
    </FlexBox>
  )
})

MobileSettings.displayName = 'MobileSettings'
