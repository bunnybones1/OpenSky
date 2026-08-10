import { FlagCodes } from '@opensky/shared/constants'
import { memo, useCallback } from 'react'

import { SoundClient } from '~/shared/clients'
import { FlexBox, Text } from '~/shared/components/Base'
import { FlagIcon } from '~/shared/components/FlagIcon'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useUpdatedAuthedAccount } from '~/shared/mutations/useUpdateAuthedAccount'

interface RegionSettingsRegionProps {
  label: string
  code?: FlagCodes
  onClick: () => void
}

export const RegionSettingsRegion = memo(
  ({ code, label, onClick }: RegionSettingsRegionProps) => {
    const { data: authedAccount } = useAuthedAccount()
    const isActive = authedAccount?.region === code
    const isNoRegion = !code

    const updateAuthedAccount = useUpdatedAuthedAccount()

    const onSelect = useCallback(() => {
      if (isActive) return

      updateAuthedAccount.mutate({
        region: code
      })

      onClick()
    }, [code, isActive, onClick, updateAuthedAccount])

    return (
      <FlexBox
        width="100%"
        height="100%"
        onClick={onSelect}
        border="1px solid"
        type="centered-row"
        borderColor={isActive ? 'purple9' : 'purple7'}
        bg={!isNoRegion ? 'purple4' : 'purple2'}
        data-region-active={isActive}
        data-region={code}
        onMouseDown={() => SoundClient.playSound('CursorMainClick')}
        onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
      >
        <FlexBox px={3} flex={1} height="100%" type="centered-row">
          <Text
            width="100%"
            color="white"
            fontSize={3}
            fontFamily="condensed"
            textWrap={true}
          >
            {label}
          </Text>
        </FlexBox>
        <FlexBox height="100%" width={50} type="centered-row">
          {!!code && <FlagIcon code={code} height="24px" />}
        </FlexBox>
      </FlexBox>
    )
  }
)

RegionSettingsRegion.displayName = 'RegionSettingsRegion'
