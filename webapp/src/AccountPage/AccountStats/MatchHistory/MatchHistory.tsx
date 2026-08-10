import clsx from 'clsx'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'
import { useMatchHistory } from '~/shared/queries/useMatchHistory'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MatchHistoryHeader } from './components/MatchHistoryHeader'
import { MatchHistoryStyle } from './MatchHistory.css'
import { MatchHistoryList } from './MatchHistoryList/MatchHistoryList'

export const MatchHistory = memo(() => {
  const { data: account } = useActiveAccount()
  const [pageIndex, setPageIndex] = useState(0)
  const { t } = useTranslation()

  const {
    data: matchHistory,
    isFetching,
    hasNextPage,
    fetchNextPage,
    error
  } = useMatchHistory(account?.address)

  const activePage = useMemo(() => {
    if (!matchHistory) return matchHistory

    if (!!matchHistory.pages[pageIndex]) {
      return matchHistory.pages[pageIndex]
    }

    if (
      pageIndex > matchHistory.pages.length - 1 &&
      !!matchHistory.pages[pageIndex - 1]
    ) {
      return matchHistory.pages[pageIndex - 1]
    }

    return undefined
  }, [matchHistory, pageIndex])

  const goToPreviousPage = useCallback(() => {
    setPageIndex((_pageIndex) => _pageIndex - 1)
  }, [])

  const goToNextPage = useCallback(() => {
    const nextPage = matchHistory?.pages[pageIndex + 1]
    setPageIndex((_pageIndex) => _pageIndex + 1)

    if (!nextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, matchHistory?.pages, pageIndex])

  if (!!error || !activePage || !activePage.list.length) {
    return (
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '16px'
        })}
      >
        <Text color="purple7" fontSize="16px">
          {t('play.noMatchesFound')}
        </Text>{' '}
      </div>
    )
  }

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        paddingTop: '32px',
        paddingBottom: '32px',
        width: 'full',
        paddingX: { base: '20px', mobile: '20px', tablet: '0px' }
      })}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            alignItems: 'center',
            justifyContent: 'flex-start',
            display: 'flex',
            flexDirection: 'column'
          }),
          MatchHistoryStyle
        )}
      >
        <MatchHistoryHeader />
        <MatchHistoryList matches={activePage.list} />
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '16px'
          })}
        >
          <Button
            text="Prev"
            onClick={goToPreviousPage}
            frameType="roundedLeft"
            colorType="default"
            disabled={pageIndex === 0}
          />
          <Button
            text="Next"
            disabled={
              (!hasNextPage &&
                !!matchHistory?.pages.length &&
                pageIndex + 1 === matchHistory.pages.length) ||
              isFetching
            }
            onClick={goToNextPage}
            frameType="roundedRight"
            colorType="default"
          />
        </div>
      </div>
    </div>
  )
})

MatchHistory.displayName = 'MatchHistory'
