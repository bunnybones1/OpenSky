import { detectGLTextureFormat } from '@opensky/shared/detectTextureFormat'
import {
  resolutionScalePercent,
  resolutionScalePercentSmall,
  resolutionScalePercentSmallUI,
  resolutionScalePercentUI
} from '@opensky/shared/renderMetrics'
import { downsamplePixels } from '@opensky/shared/renderSettings'
import { uiScale } from '@opensky/shared/userSettings'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMount } from 'react-use'

import { FlexBox, Text } from '~/shared/components/Base'

export const AdditionalTechnicalInfo = memo(() => {
  const { t } = useTranslation()

  const [gameTextureResolutionScalePercent, setGameTextureResolutionScalePercent] =
    useState(resolutionScalePercent.value)

  const [
    gameTextureResolutionScalePercentUI,
    setGameTextureResolutionScalePercentUI
  ] = useState(resolutionScalePercentUI.value)

  const [
    gameTextureResolutionScalePercentSmall,
    setGameTextureResolutionScalePercentSmall
  ] = useState(resolutionScalePercentSmall.value)
  const [
    gameTextureResolutionScalePercentSmallUI,
    setGameTextureResolutionScalePercentSmallUI
  ] = useState(resolutionScalePercentSmallUI.value)

  useMount(() => {
    listenToProperty(
      resolutionScalePercent,
      'value',
      setGameTextureResolutionScalePercent
    )

    listenToProperty(
      resolutionScalePercentSmall,
      'value',
      setGameTextureResolutionScalePercentSmall
    )
    listenToProperty(
      resolutionScalePercentUI,
      'value',
      setGameTextureResolutionScalePercentUI
    )
    listenToProperty(
      resolutionScalePercentSmallUI,
      'value',
      setGameTextureResolutionScalePercentSmallUI
    )
  })

  return (
    <FlexBox
      type="centered-start-column"
      px={48}
      pt={[16, 32, 32, 16]}
      width="100%"
      maxWidth={800}
      pb={[16, 32, 32, 16]}
    >
      <Text color="cold6" fontSize={24} fontWeight="bold" mb="16px">
        {t('cache.additionalTechnicalInfo')}
      </Text>
      <FlexBox width="100%" alignItems="center" justifyContent="flex-start" mb="16px">
        <Text
          mr="auto"
          fontFamily="mono"
          color="purple9"
          fontWeight="medium"
          fontSize={16}
        >
          {t('cache.gameTextureFormat')}:
        </Text>
        <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={16}>
          {detectGLTextureFormat()}
        </Text>
      </FlexBox>
      <FlexBox width="100%" alignItems="center" justifyContent="flex-start" mb="16px">
        <Text
          mr="auto"
          fontFamily="mono"
          color="purple9"
          fontWeight="medium"
          fontSize={16}
        >
          {t('cache.renderResolution')}:
        </Text>
        <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={16}>
          {downsamplePixels.valueString}
        </Text>
      </FlexBox>
      <FlexBox width="100%" alignItems="center" justifyContent="flex-start" mb="16px">
        <Text
          mr="auto"
          fontFamily="mono"
          color="purple9"
          fontWeight="medium"
          fontSize={16}
        >
          {t('cache.uiScale')}:
        </Text>
        <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={16}>
          {uiScale.valueString}
        </Text>
      </FlexBox>
      <FlexBox width="100%" alignItems="center" justifyContent="flex-start" mb="16px">
        <Text
          mr="auto"
          fontFamily="mono"
          color="purple9"
          fontWeight="medium"
          fontSize={16}
        >
          {t('cache.General')} {t('cache.textureResolutionFamily')}:
        </Text>
        <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={16}>
          {gameTextureResolutionScalePercent}p
        </Text>
      </FlexBox>
      <FlexBox width="100%" alignItems="center" justifyContent="flex-start" mb="16px">
        <Text
          mr="auto"
          fontFamily="mono"
          color="purple9"
          fontWeight="medium"
          fontSize={16}
        >
          {t('cache.UI')} {t('cache.textureResolutionFamily')}:
        </Text>
        <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={16}>
          {gameTextureResolutionScalePercentUI}p
        </Text>
      </FlexBox>
      <FlexBox width="100%" alignItems="center" justifyContent="flex-start" mb="16px">
        <Text
          mr="auto"
          fontFamily="mono"
          color="purple9"
          fontWeight="medium"
          fontSize={16}
        >
          {t('cache.Small')} {t('cache.textureResolutionFamily')}:
        </Text>
        <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={16}>
          {gameTextureResolutionScalePercentSmall}p
        </Text>
      </FlexBox>
      <FlexBox width="100%" alignItems="center" justifyContent="flex-start" mb="16px">
        <Text
          mr="auto"
          fontFamily="mono"
          color="purple9"
          fontWeight="medium"
          fontSize={16}
        >
          {t('cache.Small')} {t('cache.UI')} {t('cache.textureResolutionFamily')}:
        </Text>
        <Text fontFamily="mono" color="white" fontWeight="medium" fontSize={16}>
          {gameTextureResolutionScalePercentSmallUI}p
        </Text>
      </FlexBox>
    </FlexBox>
  )
})

AdditionalTechnicalInfo.displayName = 'AdditionalTechnicalInfo'
