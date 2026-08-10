import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Text } from '~/shared/components/Text'
import { Cards } from '~/shared/constants/cards'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { getCardKeywords } from './helpers/get-card-keywords'
import { KeywordNameStyle } from './Keywords.css'

interface KeywordsProps {
  id: number
}

export const Keywords = memo(({ id }: KeywordsProps) => {
  const { t } = useTranslation()

  const keywords = useMemo(() => {
    const card = Cards.get(id)

    if (!card) return

    return getCardKeywords(card, t)
  }, [id, t])

  if (!keywords || !keywords.length) return null

  return (
    <>
      {keywords.map((keyword) => (
        <div
          key={keyword.name}
          className={Sprinkles({
            width: 'full',
            paddingY: '16px',
            paddingX: '8px',
            border: '1px solid',
            borderColor: 'purple5',
            backgroundColor: 'purple2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          })}
        >
          {!!keyword.icon && (
            <ImageIcon type={keyword.icon} height="12px" marginRight="8px" />
          )}

          <Text className={KeywordNameStyle} color="white" fontSize="14px">
            {keyword.name.toUpperCase()}:
          </Text>
          <Text color="purple9" fontSize="14px" marginLeft="4px">
            {keyword.description}
          </Text>
        </div>
      ))}
    </>
  )
})

Keywords.displayName = 'Keywords'
