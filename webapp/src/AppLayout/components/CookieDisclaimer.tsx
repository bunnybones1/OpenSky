import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Text } from '~/__deprecated__/Text'
import env from '~/env'
import { FlexBox, Grid } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { Portal } from '~/shared/components/Portal'
import { GDPR_COUNTRIES } from '~/shared/constants/accounts'
import { COOKIE_SETTINGS_DIALOG_ID } from '~/shared/constants/ui'
import {
  COOKIE_POLICY_ALL,
  IDENTITY_COOKIE_POLICY_ALL,
  saveAllCookieConsent
} from '~/shared/helpers/analytics-old'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useSaveCookiePolicy } from '~/shared/mutations/useSaveCookiePolicy'
import { useCookiePolicy } from '~/shared/queries/useCookiePolicy'
import { authenticationState } from '~/shared/state/authentication-state'
import { uiState, updateUIState } from '~/shared/state/ui/ui-state'

const { openDialog } = controlDialog(COOKIE_SETTINGS_DIALOG_ID)

const CookieDisclaimer = memo(() => {
  const cookieConsent = window.localStorage.getItem('consented_cookies')
  const saveCookiePolicy = useSaveCookiePolicy()
  const { data: cookiePolicy } = useCookiePolicy()
  const { t } = useTranslation()
  const { isCookieDisclaimerHidden } = useSnapshot(uiState)

  const hasServerCookieSet = Object.keys(cookiePolicy ? cookiePolicy : []).length > 0
  const isGdprCountry =
    window.sessStorage &&
    window.sessStorage.countryCode &&
    GDPR_COUNTRIES.includes(window.sessStorage.countryCode)

  const saveAllCookies = () => {
    const policy =
      env.AUTH_MODE === 'google' ? IDENTITY_COOKIE_POLICY_ALL : COOKIE_POLICY_ALL
    saveAllCookieConsent(policy)
    if (!!authenticationState.userAddress) {
      saveCookiePolicy.mutate(policy)
    }
  }

  if (
    cookieConsent ||
    !!isCookieDisclaimerHidden ||
    !isGdprCountry ||
    hasServerCookieSet
  )
    return null

  return (
    <>
      <Portal>
        <FlexBox
          position="fixed"
          bottom={[0, 0, 0]}
          right={0}
          width={['100%']}
          p={[`32px`, '32px', '32px', '8px']}
          bg="purple3"
          borderTop="1px solid"
          borderColor="purple8"
          minHeight="40px"
          zIndex={20}
          pr={20}
          justifyContent="flex-start"
          alignItems="center"
        >
          <Grid
            gridTemplateColumns={['1fr', '1fr', '1fr', '1fr 200px']}
            gridGap="8px"
            width="100%"
            alignItems="center"
          >
            <Text
              color="purple9"
              fontSize={[14, 14, 14, 14, 16]}
              pl={2}
              textWrap={true}
              fontWeight={'500'}
              width="1"
            >
              {env.AUTH_MODE === 'google' ? (
                <>
                  Cloud Weasel uses essential session storage and lets you choose
                  whether to allow future Cloud Weasel product analytics.
                </>
              ) : (
                <>
                  {t('support.cookieDisclaimerLineOne')}
                  {t('support.cookieDisclaimerLineTwo')}{' '}
                  <a
                    href="https://sequence.xyz/cookies.html"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: '#fff',
                      textDecoration: 'none'
                    }}
                  >
                    {t('support.cookieDisclaimerLineThree')}
                  </a>
                  .
                </>
              )}
            </Text>
            <Grid
              gridTemplateColumns={['1fr 1fr']}
              gridGap="8px"
              width="100%"
              alignItems="center"
              mt={['16px', '16px', '16px', '0px']}
            >
              <Button
                frameType="default"
                colorType="blue"
                text={t('cookies.customize')}
                onClick={() => {
                  openDialog()
                }}
              />
              <Button
                frameType="default"
                colorType="blue"
                text={t('cookies.accept')}
                onClick={() => {
                  saveAllCookies()
                  updateUIState('isCookieDisclaimerHidden', true)
                }}
              />
            </Grid>
          </Grid>
        </FlexBox>
      </Portal>
    </>
  )
})

CookieDisclaimer.displayName = 'CookieDisclaimer'

export default CookieDisclaimer
