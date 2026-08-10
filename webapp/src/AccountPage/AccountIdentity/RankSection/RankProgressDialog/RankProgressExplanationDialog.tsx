import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/shared/components/Text'
import { useIsExternalProfile } from '~/shared/hooks/useIsExternalProfile'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import ProgressTable from './ProgressTable/ProgressTable'
import {
  RankProgressExplanationDialogHeader,
  RankProgressExplanationDialogStyle
} from './RankProgressExplanationDialog.css'

const TitleFontSize = { base: '16px', mobile: '18px', tablet: '26px' } as const
const FontSize = { base: '12px', mobile: '14px' } as const
const SmallFontSize = { base: '8px', mobile: '10px' } as const
const MarginTop = { base: '12px', tablet: '16px' } as const

export const RankProgressExplanationDialog = memo(() => {
  const isExternalProfile = useIsExternalProfile()
  const { t } = useTranslation()

  return (
    <div
      className={clsx(
        Sprinkles({
          overflow: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          paddingY: { base: '16px', tablet: '36px' },
          paddingX: { base: '16px', tablet: '32px' },
          flexWrap: 'nowrap',
          position: 'relative'
        }),
        RankProgressExplanationDialogStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            flexDirection: 'column',
            flexWrap: 'nowrap',
            marginRight: { base: '0px', tablet: '32px' }
          }),
          RankProgressExplanationDialogHeader
        )}
      >
        <Text
          fontSize={TitleFontSize}
          fontWeight="600"
          color="white"
          fontFamily="condensed"
        >
          {t('profile.ranksProgressTitle')}
        </Text>
        <Text
          fontSize={FontSize}
          color="purple9"
          marginTop={{ base: '12px', tablet: '16px' }}
          fontFamily="condensed"
          fontWeight="700"
        >
          {t('profile.rankTitle')}
        </Text>
        <Text fontSize={{ base: '10px', mobile: '12px' }} color="purple9">
          {t('profile.rankDesc')}
        </Text>
        <Text
          fontSize={FontSize}
          color="purple9"
          marginTop={MarginTop}
          fontFamily="condensed"
          fontWeight="700"
        >
          {t('profile.requiresTitle')}
        </Text>
        <Text fontSize={SmallFontSize} color="purple9">
          {t('profile.requiresDesc')}
        </Text>
        <Text
          fontSize={FontSize}
          color="purple9"
          marginTop={MarginTop}
          fontFamily="condensed"
          fontWeight="700"
        >
          {t('profile.softResetTitle')}
        </Text>
        <Text fontSize={{ base: '8px', mobile: '10px' }} color="purple9">
          {t('profile.softResetDesc')}
        </Text>
        <Text
          fontSize={FontSize}
          color="purple9"
          marginTop={MarginTop}
          fontFamily="condensed"
          fontWeight="700"
        >
          {t('profile.hardResetTitle')}
        </Text>
        <Text fontSize={SmallFontSize} color="purple9">
          {t('profile.hardResetDesc')}
        </Text>
        <Text
          fontSize={FontSize}
          color="purple9"
          fontFamily="condensed"
          marginTop="16px"
          fontWeight="700"
        >
          {t('profile.xpRewardTitle')}
        </Text>
        <Text fontSize={SmallFontSize} color="purple9">
          {t('profile.xpRewardDesc')}
        </Text>
        <Text
          fontSize={FontSize}
          color="purple9"
          fontFamily="condensed"
          marginTop="16px"
          fontWeight="700"
        >
          {t('profile.achievedTitle')}
        </Text>
        <Text fontSize={SmallFontSize} color="purple9">
          {t(
            `profile.${isExternalProfile ? 'externalAchievedDesc' : 'achievedDesc'}`
          )}
        </Text>
      </div>
      <ProgressTable />
    </div>
  )
})

RankProgressExplanationDialog.displayName = 'RankProgressExplanationDialog'
