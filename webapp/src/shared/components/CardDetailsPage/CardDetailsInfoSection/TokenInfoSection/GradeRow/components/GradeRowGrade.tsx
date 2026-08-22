import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import capitalize from 'lodash-es/capitalize'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GradeRowGradeImage } from './GradeRowGrade.css'

interface GradeRowGradeProps {
  grade: ItemType.SW_BASE_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
  inventoryOnly?: boolean
}

export const GradeRowGrade = memo(({ grade, inventoryOnly }: GradeRowGradeProps) => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const gradeText = useMemo(() => {
    if (grade === ItemType.SW_GOLD_CARDS) return 'gold' as const
    if (grade === ItemType.SW_SILVER_CARDS) return 'silver' as const
    return 'base' as const
  }, [grade])

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingLeft: '8px'
      })}
    >
      <Tooltip
        placement="top"
        tooltip={t(
          `cardDetails.${gradeText}Explanation${inventoryOnly ? 'Offchain' : ''}`
        )}
      >
        <Icon type="info" color="purple9" height="14px" />
      </Tooltip>
      {!!getAssetUrl && (
        <img
          className={clsx(GradeRowGradeImage, Sprinkles({ marginLeft: '4px' }))}
          src={getAssetUrl(`webapp/icons/${gradeText}-card-with-letter.webp`)}
        />
      )}
      <Text fontSize="14px" color="white" marginLeft="4px">
        {capitalize(gradeText)}
      </Text>
    </div>
  )
})

GradeRowGrade.displayName = 'GradeRowGrade'
