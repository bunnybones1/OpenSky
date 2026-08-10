import { memo, useMemo } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Cards } from '~/shared/constants/cards'
import { useCardFlavorText } from '~/shared/hooks/cards/useCardTexts'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { FlavorText } from './FlavorTextSection.css'

interface FlavorTextSectionProps {
  id: number
}

export const FlavorTextSection = memo(({ id }: FlavorTextSectionProps) => {
  const card = useMemo(() => Cards.get(id), [id])

  const flavorTextInfo = useCardFlavorText(card?.baseId)

  if (!flavorTextInfo?.text && !flavorTextInfo?.explainer) return null

  return (
    <div
      className={Sprinkles({
        width: 'full',
        padding: '8px',
        border: '1px solid',
        borderColor: 'purple5',
        backgroundColor: 'purple2',
        display: 'flex',
        justifyContent: 'flex-start'
      })}
    >
      <Icon type={'scroll'} height={'24px'} color="purple6" />
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          width: 'full',
          paddingLeft: '8px'
        })}
      >
        {!!flavorTextInfo?.text && (
          <Text
            color="purple9"
            fontSize="14px"
            fontWeight={'600'}
            className={FlavorText}
          >
            {flavorTextInfo?.text}
          </Text>
        )}
        {!!flavorTextInfo?.explainer && (
          <Text
            color="purple9"
            marginTop="8px"
            fontSize="14px"
            className={FlavorText}
          >
            {`- ${flavorTextInfo?.explainer}`}
          </Text>
        )}
        {!!flavorTextInfo?.author && (
          <Text
            color="purple9"
            marginTop="8px"
            fontSize="14px"
            className={FlavorText}
          >
            {`- ${flavorTextInfo?.author}`}
          </Text>
        )}
      </div>
    </div>
  )
})

FlavorTextSection.displayName = 'FlavorTextSection'
