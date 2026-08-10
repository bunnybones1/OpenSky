import { useEffect, useState } from 'react'

import { GameMode, GMMatch, Page, SortOrder } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { CursorPage } from '~/shared/constants/misc'
import { generatePageRequestWithCursor } from '~/shared/helpers/generate-request-with-cursor'

type SortColumn = 'started_at' | 'ended_at'

//TODO: Move to react-query
const useMatches = (accountAddress?: string) => {
  const [matches, setMatches] = useState<GMMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState<Page>()

  const [sortOrder, setSortOrder] = useState(SortOrder.DESC)
  const [sortColumn, setSortColumn] = useState<SortColumn>('ended_at')
  // const totalRecords = (page && page.totalRecords) || 0
  const isSortStarted = sortColumn === 'started_at'
  const isSortEnded = sortColumn === 'ended_at'
  const showPagination = /*totalRecords > pageSize*/ true
  // const currentPage = (page && page.page) || 1
  // const pageCount = Math.ceil(totalRecords / pageSize)

  const toggleSortOrder = () => {
    const sortDesc = sortOrder === SortOrder.DESC
    const newSortOrder = sortDesc ? SortOrder.ASC : SortOrder.DESC
    setSortOrder(newSortOrder)
  }

  const toggleSortStarted = () => {
    if (isSortStarted) return toggleSortOrder()
    setSortOrder(SortOrder.DESC)
    setSortColumn('started_at')
  }

  const toggleSortEnded = () => {
    if (isSortEnded) return toggleSortOrder()
    setSortOrder(SortOrder.DESC)
    setSortColumn('ended_at')
  }

  const fetchMatches = (cursorPage?: CursorPage) => {
    setLoading(true)

    const newPage: Page = generatePageRequestWithCursor(cursorPage, page, {
      pageSize: 50,
      sort: [
        {
          column: sortColumn,
          order: sortOrder
        }
      ]
    })

    APIClient.opensky
      .gMListMatches({
        req: {
          accountAddress,
          modes: [
            GameMode.RANKED_CONSTRUCTED,
            GameMode.RANKED_DISCOVERY,
            GameMode.CONQUEST_CONSTRUCTED,
            GameMode.CONQUEST_DISCOVERY
          ]
        },
        page: newPage
      })
      .then((res) => {
        if (res.res.length > 0) {
          setMatches(res.res)
          setPage(res.page)
          setError('')
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // TODO: Remove async effect
    fetchMatches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountAddress, sortColumn, sortOrder])

  const toggleReviewed = (matchId: number, reviewed: boolean) => {
    setLoading(true)
    return APIClient.opensky
      .gMSetReviewed({ matchId, reviewed })
      .then(() => {
        // update local state
        setMatches((prevMatches) =>
          prevMatches.map((match) => {
            if (match.match.id === matchId) return { ...match, reviewed }
            return match
          })
        )
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  return {
    matches,
    loading,
    error,
    toggleReviewed,
    fetchMatches,
    pagination: {
      page,
      setPage,
      // currentPage,
      // pageCount,
      showPagination,
      sortOrder,
      sortColumn,
      isSortStarted,
      isSortEnded,
      toggleSortStarted,
      toggleSortEnded
      // totalRecords
    }
  }
}

export default useMatches
