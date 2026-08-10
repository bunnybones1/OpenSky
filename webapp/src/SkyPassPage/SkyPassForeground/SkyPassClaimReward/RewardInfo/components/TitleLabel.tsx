import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ItemType } from '~/lib/proto'
import { FlexBox, Text } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'

const TITLE_LABEL_TYPES = [
  ItemType.SW_HERO_SKINS,
  ItemType.SW_HERO,
  ItemType.SW_CARD_BACKS
]

interface Props {
  type: ItemType
  unlockedDecks: boolean
}

export const TitleLabel = memo(({ type, unlockedDecks }: Props) => {
  const { t } = useTranslation()
  const isTablet = useResponsiveQuery('tablet')
  const isSmallScreen = !isTablet

  const titleIcon = useMemo(() => {
    switch (type) {
      case ItemType.SW_HERO:
        return <ImageIcon height="16px" type={'heroes-base'} />
      case ItemType.SW_HERO_SKINS:
        return <ImageIcon height="16px" type={'heroes-gold'} />
      case ItemType.SW_CARD_BACKS:
        return <Icon type="card-back" color="purple9" height="12px" />
      default:
        return null
    }
  }, [type])

  if (!TITLE_LABEL_TYPES.includes(type)) return null

  return (
    <FlexBox
      width="100%"
      position="relative"
      type="centered-end-row"
      pb={'4px'}
      zIndex={4}
    >
      {titleIcon}
      <Text
        textWrap
        color={type === ItemType.SW_HERO_SKINS ? 'warm7' : 'purple9'}
        fontSize={!isSmallScreen ? 14 : [16, 16, 16, 24]}
        fontFamily="condensed"
        fontWeight="bold"
        pl={'4px'}
        style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
      >
        {t(`skypass.titleLabels.${type}`)}
      </Text>
      {type === ItemType.SW_HERO && unlockedDecks && (
        <>
          <Text
            textWrap
            color="purple9"
            fontSize={!isSmallScreen ? 14 : [16, 16, 16, 24]}
            fontFamily="condensed"
            fontWeight="bold"
            pl={'4px'}
            style={{
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            +
            <Icon
              type="deck"
              color="purple9"
              height="14px"
              style={{ paddingLeft: '2px', paddingRight: '4px' }}
            />
            {t('skypass.deck')}
          </Text>
        </>
      )}
    </FlexBox>
  )
})

TitleLabel.displayName = 'TitleLabel'
