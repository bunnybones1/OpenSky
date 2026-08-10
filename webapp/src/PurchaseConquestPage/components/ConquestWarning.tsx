import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Text } from '~/__deprecated__/Text'
import { Box } from '~/shared/components/Base'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Button } from '~/shared/components/Button'
import { Portal } from '~/shared/components/Portal'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface Props {
  imageUrl: string
  confirmStyle?: string
  dismissStyle?: string
  callbackFn: any
}

const ConquestWarning = memo(({ imageUrl, callbackFn }: Props) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <Portal>
      <FlexBox
        position="fixed"
        type="centered-row"
        width="100vw"
        height="100vh"
        top="0px"
        left="0px"
        zIndex={20}
        bg={'rgba(0, 0, 0, 0.5)'}
      >
        <FlexBox
          minWidth={['80vw', '80vw', '80vw', 400]}
          maxWidth={[300, 300, 300, 500]}
          maxHeight={'100vh'}
          p="2px"
          border="2px solid"
          borderColor="#0080b1"
          bg="#05030e"
          overflow="hidden"
          zIndex={20}
          position="relative"
          style={{
            overflowY: 'auto'
          }}
        >
          <FlexBox position="absolute" right="0" top="0">
            <Button
              frameType="rightCorner"
              colorType="default"
              leftAdornment={{
                icon: 'close'
              }}
              onClick={() => {
                callbackFn(false)
              }}
            />
          </FlexBox>
          <FlexBox
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover'
            }}
            width="100%"
            height={[50, 100, 150]}
            border="1px solid"
            borderColor="purple5"
            borderBottom="none"
          />

          <FlexBox
            border="1px solid"
            borderColor="purple5"
            width="100%"
            type="start-column"
            position="relative"
            bg="transparent"
            height="auto"
            overflow="hidden"
          >
            <FlexBox type="centered-row" p={24} width="100%" zIndex={2} height="auto">
              <Text
                fontSize={16}
                fontWeight="400"
                color="purple9"
                textWrap={true}
                textAlign="center"
              >
                <Box color="warm9">{t('play.conquestWarningLineOne')}</Box>
                <Box color="warm9">{t('play.conquestWarningLineTwo')}</Box>
              </Text>
            </FlexBox>
            <FlexBox
              width="100%"
              flexWrap="nowrap"
              p={20}
              pt={0}
              zIndex={2}
              type="centered-row"
              position="relative"
            >
              <FlexBox flex={1} mr={1}>
                <Button
                  frameType="default"
                  colorType="blue"
                  text={t('navigation.goBack')}
                  data-id="promptAlertDismiss"
                  onClick={() => {
                    callbackFn(false)
                    navigate(ROUTES_CONFIG.directPath)
                  }}
                  className={Sprinkles({ width: 'full' })}
                />
              </FlexBox>
              <FlexBox flex={1} ml={1}>
                <Button
                  frameType="default"
                  colorType="secondary"
                  text={t('generic.CONTINUE')}
                  data-id="promptAlertConfirm"
                  onClick={async () => {
                    callbackFn(false)
                  }}
                  className={Sprinkles({ width: 'full' })}
                />
              </FlexBox>
            </FlexBox>
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </Portal>
  )
})

ConquestWarning.displayName = 'ConquestWarning'

export default ConquestWarning
