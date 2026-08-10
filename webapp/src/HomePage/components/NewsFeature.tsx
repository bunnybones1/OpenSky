import styled from '@emotion/styled'
import { memo, useCallback, useMemo } from 'react'

import { FlexBox, Text } from '~/shared/components/Base'
import NewBadge from '~/shared/components/LargeCornerBadge'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import {
  PostOrPageWithImages,
  useMarkArticleAsSeen,
  useNewsArticle
} from '~/shared/queries/useNewsArticle'

import { GraphicBox } from '../shared/components/GraphicBox'

interface NewsFeatureProps {
  articleNumber: number
  // True if this article is the newest & will appear in the
  // more "featured" section of the grid
  isBigFeature?: boolean
  dataId: string
}

const NewsFeature = memo(
  ({ articleNumber, isBigFeature, dataId }: NewsFeatureProps) => {
    const markArticleAsSeen = useMarkArticleAsSeen()
    const isTabletWide = useResponsiveQuery('tabletWide')
    const selectArticle = useCallback((data: PostOrPageWithImages[]) => {
      return data[articleNumber - 1]
      // articleNumber shouldnt ever change
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const { article } = useNewsArticle(selectArticle)

    const cornerHeight = useMemo(() => {
      if (isBigFeature && isTabletWide) {
        return '13%'
      }
      if (!isTabletWide) return '55%'
      return '31%'
    }, [isBigFeature, isTabletWide])

    const bgImage = useMemo(() => {
      if (isBigFeature && isTabletWide) {
        return article?.images.vertical
      }
      return article?.images.landscape
    }, [isTabletWide, article, isBigFeature])

    const markAsSeen = useCallback(() => {
      if (!!article && !!article.isNew) {
        markArticleAsSeen.mutate(article.id)
      }
    }, [article, markArticleAsSeen])

    return (
      <GraphicBox
        bgImage={bgImage}
        showTopLeftGraphic
        showTopRightGraphic
        cornerHeight={cornerHeight}
        onHover={markAsSeen}
        dataId={dataId}
      >
        {!!article?.isNew && <NewBadge badgeText="New" badgeColor="warm6" />}
        <FlexBox
          width="100%"
          height="100%"
          flexDirection="column"
          alignItems="flex-end"
          justifyContent="flex-end"
        >
          <NewsFeatureTextWrapper
            px={[16, 16, 16, 24]}
            pb={[16, 16, 16, 24]}
            pt={isBigFeature ? 48 : [32, 32, 32, 48]}
            alignItems="flex-start"
            justifyContent="flex-start"
            width="100%"
          >
            <Text
              textWrap
              color="white"
              fontSize={isBigFeature && isTabletWide ? 32 : [16, 16, 16, 24]}
              fontFamily="condensed"
              fontWeight="extraBold"
            >
              {article?.title}
            </Text>
          </NewsFeatureTextWrapper>
        </FlexBox>
      </GraphicBox>
    )
  }
)

const NewsFeatureTextWrapper = styled(FlexBox)`
  .sequence-platforms-text {
    text-transform: uppercase;
  }
  background: linear-gradient(
    0deg,
    #0c061e 0%,
    rgba(12, 6, 30, 0.55) 76.39%,
    rgba(12, 6, 30, 0) 100%
  );
`

NewsFeature.displayName = 'NewsFeature'

export const NewsFeatureOne = memo(() => (
  <NewsFeature dataId="news-one" articleNumber={1} />
))
NewsFeatureOne.displayName = 'NewsFeatureOne'

export const NewsFeatureTwo = memo(() => (
  <NewsFeature dataId="news-two" articleNumber={2} />
))
NewsFeatureTwo.displayName = 'NewsFeatureTwo'

export const NewsFeatureThree = memo(() => (
  <NewsFeature dataId="news-three" articleNumber={3} />
))
NewsFeatureThree.displayName = 'NewsFeatureThree'

export const NewsFeatureFour = memo(() => (
  <NewsFeature dataId="news-four" articleNumber={4} />
))
NewsFeatureFour.displayName = 'NewsFeatureFour'
