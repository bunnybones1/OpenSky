import styled from '@emotion/styled'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { FlexBox, Text } from '~/shared/components/Base'
import { CARD_ITEM_TYPES } from '~/shared/constants/cards'
import { TAG_ART } from '~/shared/constants/tag-art'
import { getCardTexts } from '~/shared/hooks/cards/useCardTexts'
import { useSeasonInfo } from '~/shared/queries/useSeasonInfo'
import { useMultiTypeTokenBalances } from '~/shared/queries/useTokenBalances'

import { TagSettingsTag } from './components/TagSettingsTag'

interface TagSettingsTagsProps {
  search: string
  returnToDefaultPage: () => void
}

export const TagSettingsTags = memo(
  ({ search, returnToDefaultPage }: TagSettingsTagsProps) => {
    const cardBalances = useMultiTypeTokenBalances(CARD_ITEM_TYPES)
    const { t } = useTranslation()
    const { data: seasonInfo } = useSeasonInfo()

    const tagsWithOwnership = useMemo(() => {
      return Array.from(TAG_ART)
        .filter(([_, tagArt]) => {
          if (
            !!seasonInfo &&
            !!tagArt.cardSeason &&
            tagArt.cardSeason > seasonInfo.currentSeason
          ) {
            return false
          }
          return true
        })
        .map(([_, tagArt]) => {
          let isLocked = false

          if (tagArt.type !== 'bg') {
            if (!tagArt.cardId || !cardBalances || !cardBalances.length) {
              isLocked = true
            } else if (!!tagArt.cardId) {
              const hasCardBalance = !!cardBalances?.some(
                (balance) =>
                  String(balance.id) === tagArt.cardId && balance.balance > 0
              )
              isLocked = !hasCardBalance
            }
          }

          return {
            ...tagArt,
            isLocked
          }
        })
        .sort((x, y) => {
          if (x.isLocked === y.isLocked) return 0
          if (!x.isLocked) return -1
          return 1
        })
    }, [cardBalances, seasonInfo])

    const tags = useMemo(() => {
      const tags = tagsWithOwnership.filter((tagArt) => {
        if (!!search) {
          if (!!tagArt.cardId) {
            const { name } = getCardTexts(tagArt.cardId, t)
            if (!!name) {
              return name.toLowerCase().includes(search.toLowerCase())
            } else {
              return false
            }
          }
          if (tagArt.type === 'bg') {
            return tagArt.artUrl.toLowerCase().includes(search.toLowerCase())
          } else {
            return false
          }
        } else {
          return true
        }
      })
      return tags
    }, [tagsWithOwnership, search, t])

    return (
      <>
        {!tags.length ? (
          <FlexBox height="100%" width="100%" type="centered-row">
            <Text
              fontSize={[18, 20, 24]}
              color="purple7"
              fontWeight="bold"
              textWrap={true}
            >
              {t(`profile.${!!search ? 'notagArtResults' : 'tagArtEmpty'}`)}
            </Text>
          </FlexBox>
        ) : (
          <TagArtGrid>
            {tags.map((tag) => (
              <TagSettingsTag
                type={tag.type}
                onClick={returnToDefaultPage}
                key={tag.id}
                id={tag.id}
                isLocked={tag.isLocked}
              />
            ))}
          </TagArtGrid>
        )}
      </>
    )
  }
)

const TagArtGrid = styled.div`
  display: grid;
  height: 100%;
  width: 100%;
  padding: 0px 16px;
  grid-gap: 16px;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 40px;
`

TagSettingsTags.displayName = 'TagSettingsTags'
