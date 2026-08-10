import styled from '@emotion/styled'
import { FlagCodes } from '@opensky/shared/constants'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Button } from '~/shared/components/Button'
import { FlagIcon } from '~/shared/components/FlagIcon'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'

interface Props {
  handleList: () => void
}

export const RegionButton = memo(({ handleList }: Props) => {
  const { t } = useTranslation()

  const { data: authedAccount } = useAuthedAccount()
  const region = authedAccount?.region as FlagCodes | undefined

  return (
    <Box
      height={50}
      width="100%"
      borderRadius="4px"
      overflow="hidden"
      position="relative"
      border="1px solid"
      borderColor="purple11"
      bg="purple4"
    >
      <Box
        position="absolute"
        top="50%"
        right="6px"
        zIndex={2}
        transform="translateY(-50%)"
      >
        <Button
          frameType="default"
          colorType="default"
          onClick={handleList}
          buttonClassName={FullWidthButtonStyle}
          className={FullWidthButtonStyle}
          buttonId="region-settings"
          text={t('profile.changeRegion')}
          data-id="regionButton"
        />
      </Box>
      <FlexBox width="100%" height="100%" type="centered-start-row">
        <FlexBox width="calc(100% - 102px)" height="100%" type="centered-row">
          {!!region && (
            <StyledRegionButtonFlag width={28}>
              <FlagIcon code={region} height="24px" />
            </StyledRegionButtonFlag>
          )}
        </FlexBox>
      </FlexBox>
    </Box>
  )
})

const StyledRegionButtonFlag = styled(Box)`
  .flag-icon {
    width: 100%;
    height: 100%;
    background-size: 100%;
  }
`

RegionButton.displayName = 'RegionButton'
