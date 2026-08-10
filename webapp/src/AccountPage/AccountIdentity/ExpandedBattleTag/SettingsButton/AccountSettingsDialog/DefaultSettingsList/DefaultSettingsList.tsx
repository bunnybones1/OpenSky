import { UserStorageKeys } from '@opensky/shared/constants'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Box, FlexBox, Text } from '~/shared/components/Base'
import { Checkbox } from '~/shared/components/Checkbox'
import { useUpdateUserStorage } from '~/shared/mutations/useUpdateUserStorage'
import { useUserStorage } from '~/shared/queries/useUserStorage'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GameCacheSettings } from './components/GameCacheSettings'
import { LocaleSettings } from './components/LocaleSettings'
import { MobileSettings } from './components/MobileSettings'
import { RegionButton } from './components/RegionButton'
import { TagArtButton } from './components/TagArtButton'
import { TitleButton } from './components/TitleButton'
import { UserNameSettingInput } from './components/UserNameSettingInput'
import { DeleteAccountSettings } from './DeleteAccountSettings/DeleteAccountSettings'
import { SoundSettings } from './SoundSettings/SoundSettings'

interface DefaultSettingsListProps {
  setListMode: (mode: 'default' | 'art' | 'country' | 'title') => void
}

export const DefaultSettingsList = memo(
  ({ setListMode }: DefaultSettingsListProps) => {
    const { t } = useTranslation()

    const setTagArtList = useCallback(() => {
      setListMode('art')
    }, [setListMode])

    const setRegionList = useCallback(() => {
      setListMode('country')
    }, [setListMode])

    const setTitleList = useCallback(() => {
      setListMode('title')
    }, [setListMode])

    const { data: hideUSDCBalance } = useUserStorage(UserStorageKeys.HIDE_USDC_VALUE)

    const updateUserStorage = useUpdateUserStorage()

    const onHideUSDCCheck = useCallback(
      (value: boolean) => {
        updateUserStorage.mutate({
          key: UserStorageKeys.HIDE_USDC_VALUE,
          value: !value
        })
      },
      [updateUserStorage]
    )

    return (
      <>
        <FlexBox
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          width="100%"
        >
          <Text pb={10} fontSize={18} color="purple9" fontWeight="bold">
            {t('profile.SKYTAG')}
          </Text>
          <FlexBox type="centered-column">
            <Box width={238}>
              <TagArtButton handleList={setTagArtList} />
            </Box>
            <Box width={238} mt={2}>
              <TitleButton handleList={setTitleList} />
            </Box>
            <Box width={238} mt={2}>
              <RegionButton handleList={setRegionList} />
            </Box>
          </FlexBox>
        </FlexBox>
        <LocaleSettings />
        <UserNameSettingInput />
        <SoundSettings />
        <div
          className={Sprinkles({
            width: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '32px'
          })}
        >
          <Checkbox
            onChange={onHideUSDCCheck}
            text={t('support.hideUSDC')}
            isDisabled={updateUserStorage.status === 'loading'}
            value={!!hideUSDCBalance}
            isActive={!!hideUSDCBalance}
          />
        </div>
        <GameCacheSettings />
        <MobileSettings />
        <DeleteAccountSettings />
      </>
    )
  }
)

DefaultSettingsList.displayName = 'DefaultSettingsList'
