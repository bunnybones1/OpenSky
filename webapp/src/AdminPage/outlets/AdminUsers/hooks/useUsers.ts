import { GMStatsResponse } from '@opensky/proto'
import { useEffect, useState } from 'react'

import { GMAccount, Page, SortOrder } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { CursorPage } from '~/shared/constants/misc'
import { generatePageRequestWithCursor } from '~/shared/helpers/generate-request-with-cursor'

type SortColumn = 'created_at'

const useUsers = () => {
  const [users, setUsers] = useState<GMAccount[]>([])
  // const [totalUsers, setTotalUsers] = useState<number>()
  const [stats, setStats] = useState<GMStatsResponse>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState<Page>()
  const [sortOrder, setSortOrder] = useState(SortOrder.DESC)
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at')
  // const totalRecords = (page && page.totalRecords) || 0
  const isSortCreated = sortColumn === 'created_at'
  const pageSize = page?.pageSize || 0
  const showPagination = /*totalRecords > pageSize*/ true
  // const currentPage = (page && page.page) || 1
  // const pageCount = Math.ceil(totalRecords / pageSize)

  const toggleSortOrder = () => {
    const sortDesc = sortOrder === SortOrder.DESC
    const newSortOrder = sortDesc ? SortOrder.ASC : SortOrder.DESC
    setSortOrder(newSortOrder)
    setPage(undefined)
  }

  const toggleSortCreated = () => {
    if (isSortCreated) return toggleSortOrder()
    setSortOrder(SortOrder.DESC)
    setSortColumn('created_at')
    setPage(undefined)
  }

  const fetchUsers = (cursorPage?: CursorPage) => {
    if (!loading) {
      setLoading(true)

      const newPage: Page = generatePageRequestWithCursor(cursorPage, page, {
        pageSize: 10,
        sort: [
          {
            column: sortColumn,
            order: sortOrder
          }
        ]
      })

      APIClient.opensky
        .gMListAccounts({
          page: newPage
        })
        .then((res) => {
          if (res.accounts.length > 0) {
            setUsers(res.accounts)
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
    // TODO: Remove async effect
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortColumn, sortOrder])

  useEffect(() => {
    APIClient.opensky
      .gMStats()
      .then((res) => {
        setStats(res.stats)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  return {
    users,
    stats,
    loading,
    error,
    fetchUsers,
    pagination: {
      page,
      sortOrder,
      sortColumn,
      isSortCreated,
      toggleSortCreated,
      setPage,

      pageSize,
      showPagination
      // currentPage
      // pageCount
    }
  }
}

export default useUsers
