import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { PlayerRank } from '~/lib/proto'
import { Text } from '~/shared/components/Text'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ProgressRow } from './components/ProgressRow'
import { ProgressTableStyle, TableHeader } from './ProgressTable.css'

const FontSize = { base: '12px', tablet: '16px' } as const

const ProgressTable = memo(() => {
  const { t } = useTranslation()
  const isTablet = useResponsiveQuery('tablet')
  const isSmallScreen = !isTablet

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          border: '1px solid',
          borderColor: 'purple5',
          height: 'auto',
          flexWrap: 'nowrap'
        }),
        ProgressTableStyle
      )}
    >
      <div
        className={clsx(Sprinkles({ width: 'full', display: 'grid' }), TableHeader)}
      >
        <Text
          marginLeft="20px"
          fontSize={FontSize}
          color="white"
          fontFamily="condensed"
        >
          {t('ranks.rank')}
        </Text>

        <Text
          fontSize={FontSize}
          color="white"
          fontFamily="condensed"
          textAlign={'center'}
        >
          {t('profile.requiresTitle')}
        </Text>

        <Text fontSize={FontSize} color="white" fontFamily="condensed">
          {t('profile.softReset')}
        </Text>

        <Text fontSize={FontSize} color="white" fontFamily="condensed">
          {t('profile.hardReset')}
        </Text>

        <Text fontSize={FontSize} color="white" fontFamily="condensed">
          {t('profile.xpRewardTitle')}
        </Text>

        <Text fontSize={FontSize} color="white" fontFamily="condensed">
          {t('profile.achievedTitle')}
        </Text>
      </div>
      {Object.entries(ranksInfoList).map(([key, value]) => {
        return (
          <ProgressRow
            key={key}
            info={value}
            rank={key as RankTypes}
            isSmallScreen={isSmallScreen}
          />
        )
      })}
    </div>
  )
})

ProgressTable.displayName = 'ProgressTable'

export default ProgressTable

export type RankTypes =
  | 'WANDERER-STAGE_I'
  | 'WANDERER-STAGE_II'
  | 'WANDERER-STAGE_III'
  | 'TRAINEE-STAGE_I'
  | 'TRAINEE-STAGE_II'
  | 'TRAINEE-STAGE_III'
  | 'APPRENTICE-STAGE_I'
  | 'APPRENTICE-STAGE_II'
  | 'APPRENTICE-STAGE_III'
  | 'EXPERT-STAGE_I'
  | 'EXPERT-STAGE_II'
  | 'EXPERT-STAGE_III'
  | 'MASTER'
  | 'GRANDWEAVER'

export type TableRow = {
  pointsRequired: number
  softReset: number
  hardReset: number
  reward: number
}

type TableRowGroup = {
  [key in RankTypes]: TableRow
}

const ranksInfoList: TableRowGroup = {
  ['WANDERER-STAGE_I']: {
    pointsRequired: 0,
    softReset: 0,
    hardReset: 0,
    reward: 0
  },
  ['WANDERER-STAGE_II']: {
    pointsRequired: 100,
    softReset: 0,
    hardReset: 0,
    reward: 100
  },
  ['WANDERER-STAGE_III']: {
    pointsRequired: 200,
    softReset: 0,
    hardReset: 0,
    reward: 100
  },
  ['TRAINEE-STAGE_I']: {
    pointsRequired: 300,
    softReset: 0,
    hardReset: 0,
    reward: 100
  },
  ['TRAINEE-STAGE_II']: {
    pointsRequired: 400,
    softReset: 0,
    hardReset: 0,
    reward: 100
  },
  ['TRAINEE-STAGE_III']: {
    pointsRequired: 500,
    softReset: 0,
    hardReset: 0,
    reward: 100
  },
  ['APPRENTICE-STAGE_I']: {
    pointsRequired: 600,
    softReset: 0,
    hardReset: 0,
    reward: 200
  },
  ['APPRENTICE-STAGE_II']: {
    pointsRequired: 700,
    softReset: 0,
    hardReset: 650,
    reward: 100
  },
  ['APPRENTICE-STAGE_III']: {
    pointsRequired: 800,
    softReset: 0,
    hardReset: 700,
    reward: 100
  },
  ['EXPERT-STAGE_I']: {
    pointsRequired: 900,
    softReset: 0,
    hardReset: 750,
    reward: 300
  },
  ['EXPERT-STAGE_II']: {
    pointsRequired: 1000,
    softReset: 0,
    hardReset: 800,
    reward: 100
  },
  ['EXPERT-STAGE_III']: {
    pointsRequired: 1100,
    softReset: 0,
    hardReset: 850,
    reward: 100
  },
  [PlayerRank.MASTER]: {
    pointsRequired: 1200,
    softReset: 1300,
    hardReset: 900,
    reward: 400
  },
  [PlayerRank.GRANDWEAVER]: {
    pointsRequired: 100,
    softReset: 1400,
    hardReset: 1000,
    reward: 0
  }
}
