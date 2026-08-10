import { useEffect, useState } from 'react'

import { GMPendingCardsReponse, Page, SortOrder } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { CursorPage } from '~/shared/constants/misc'
import { generatePageRequestWithCursor } from '~/shared/helpers/generate-request-with-cursor'

type SortColumn = 'mint_at'

// TODO: Move to react-query
const usePending = () => {
  const [pendingItems, setPendingItems] = useState<GMPendingCardsReponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // TODO: Why do we have these state values if nothing is setting / using them?
  const [page, setPage] = useState<Page>()
  const [sortOrder, _a] = useState(SortOrder.DESC)
  const [sortColumn, _b] = useState<SortColumn>('mint_at')
  const defaultPageSize = 50

  const fetchPending = (cursorPage?: CursorPage) => {
    if (!loading) {
      setLoading(true)

      const newPage: Page = generatePageRequestWithCursor(cursorPage, page, {
        pageSize: defaultPageSize,
        sort: [
          {
            column: sortColumn,
            order: sortOrder
          }
        ]
      })

      APIClient.opensky
        .gMListPendingCards({
          page: newPage
        })
        .then((res) => {
          if (res.response.length > 0) {
            setPendingItems(res.response)
            setPage(res.page)
            setError('')
          }
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => {
          setLoading(false)
        })
    }
  }

  useEffect(() => {
    setLoading(true)
    APIClient.opensky
      .gMListPendingCards({
        page: {
          pageSize: defaultPageSize
        }
      })
      .then((res) => {
        setPendingItems(res.response)
        setPage(res.page)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sortColumn, sortOrder])

  return {
    pendingItems,
    loading,
    error,
    fetchPending,
    pagination: {
      page,
      sortOrder,
      sortColumn,
      setPage
    }
  }
}

export default usePending
