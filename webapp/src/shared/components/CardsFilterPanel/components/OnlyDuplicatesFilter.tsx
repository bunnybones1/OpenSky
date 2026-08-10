import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '~/shared/components/Checkbox'
import { Text } from '~/shared/components/Text'

interface OnlyDuplicatesFilterProps {
  onlyDuplicates: boolean
  onChange: (value: boolean) => void
}

export const OnlyDuplicatesFilter = memo(
  ({ onlyDuplicates, onChange }: OnlyDuplicatesFilterProps) => {
    const { t } = useTranslation()
    return (
      <>
        <Text fontSize="16px" color="purple7" fontWeight="600">
          {t('generic.DUPLICATES')}
        </Text>
        <Checkbox
          isActive={onlyDuplicates}
          onChange={onChange}
          value={onlyDuplicates}
          text={t('search.MultipleOwned')}
        />
      </>
    )
  }
)

OnlyDuplicatesFilter.displayName = 'OnlyDuplicatesFilter'
