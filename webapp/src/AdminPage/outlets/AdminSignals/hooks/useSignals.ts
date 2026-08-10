import { useEffect, useState } from 'react'

import { AccountSignalSummary, AccountStatus, Page, SortOrder } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { CursorPage } from '~/shared/constants/misc'
import { generatePageRequestWithCursor } from '~/shared/helpers/generate-request-with-cursor'

type SortColumn = 'score' | 'updated_at' | 'created_at'
type FilterDate = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'

const useSignals = () => {
  const [signals, setSignals] = useState<AccountSignalSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState<Page>()
  const [filterStatus, setFilterStatus] = useState<AccountStatus[]>([])
  const [sortOrder, setSortOrder] = useState(SortOrder.DESC)
  const [sortColumn, setSortColumn] = useState<SortColumn>('score')
  const [filterDate, setFilterDate] = useState<FilterDate>('all')
  const isSortScore = sortColumn === 'score'
  const isSortUpdated = sortColumn === 'updated_at'
  const isSortCreated = sortColumn === 'created_at'
  // const currentPage = (page && page.page) || 1
  const pageCount = 20 // Note: fixed size due to DB load

  const toggleStatusFilter = (filter: AccountStatus) => {
    filterStatus.includes(filter)
      ? setFilterStatus(filterStatus.filter((status) => status !== filter))
      : setFilterStatus([...filterStatus, filter])

    setPage(undefined)
  }

  const toggleSortOrder = () => {
    const sortDesc = sortOrder === SortOrder.DESC
    const newSortOrder = sortDesc ? SortOrder.ASC : SortOrder.DESC
    setSortOrder(newSortOrder)
    setPage(undefined)
  }

  const toggleSortScore = () => {
    if (isSortScore) return toggleSortOrder()
    setSortOrder(SortOrder.DESC)
    setSortColumn('score')
    setPage(undefined)
  }

  const toggleSortUpdated = () => {
    if (isSortUpdated) return toggleSortOrder()
    setSortOrder(SortOrder.DESC)
    setSortColumn('updated_at')
    setPage(undefined)
  }

  const toggleSortCreated = () => {
    if (isSortCreated) return toggleSortOrder()
    setSortOrder(SortOrder.DESC)
    setSortColumn('created_at')
    setPage(undefined)
  }

  const fetchSignals = (cursorPage?: CursorPage) => {
    if (!loading) {
      setLoading(true)
      setError('')

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
        .gMAccountSignalSummaries({
          accountStatus: filterStatus,
          createdBefore: new Date().toISOString(),
          createdAfter: getCreatedAfterFilter(filterDate),
          page: newPage
        })
        .then((res) => {
          if (res.signals.length > 0) {
            setSignals(res.signals)
            setPage(res.page)
            setError('')
          }
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false))
    }
  }

  useEffect(() => {
    // TODO: Remove async effect
    fetchSignals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortColumn, sortOrder, filterStatus, filterDate])

  return {
    signals,
    loading,
    error,
    fetchSignals,
    pagination: {
      page,
      setPage,

      sortOrder,
      setSortOrder,
      toggleSortOrder,
      sortColumn,
      setSortColumn,
      isSortScore,
      isSortUpdated,
      isSortCreated,
      toggleSortScore,
      toggleSortUpdated,
      toggleSortCreated,
      // currentPage,
      pageCount,
      filter: {
        date: {
          filterDate,
          setFilterDate
        },
        status: {
          statusActive: filterStatus.includes(AccountStatus.ACTIVE),
          statusSuspended: filterStatus.includes(AccountStatus.SUSPENDED),
          statusBanned: filterStatus.includes(AccountStatus.BANNED),
          statusFlagged: filterStatus.includes(AccountStatus.FLAGGED),
          statusVIP: filterStatus.includes(AccountStatus.VIP),
          toggleStatusActive: () => toggleStatusFilter(AccountStatus.ACTIVE),
          toggleStatusSuspended: () => toggleStatusFilter(AccountStatus.SUSPENDED),
          toggleStatusBanned: () => toggleStatusFilter(AccountStatus.BANNED),
          toggleStatusFlagged: () => toggleStatusFilter(AccountStatus.FLAGGED),
          toggleStatusVIP: () => toggleStatusFilter(AccountStatus.VIP)
        }
      }
    }
  }
}

function getCreatedAfterFilter(filter: FilterDate) {
  const now = new Date()
  const ONE_HOUR = 60 * 60 * 1000
  const ONE_DAY = 24 * ONE_HOUR
  const ONE_WEEK = 7 * ONE_DAY
  const ONE_MONTH = 4 * ONE_WEEK
  const ONE_YEAR = 12 * ONE_MONTH

  switch (filter) {
    case 'hour':
      return new Date(now.getTime() - ONE_HOUR).toISOString()
    case 'day':
      return new Date(now.getTime() - ONE_DAY).toISOString()
    case 'week':
      return new Date(now.getTime() - ONE_WEEK).toISOString()
    case 'month':
      return new Date(now.getTime() - ONE_MONTH).toISOString()
    case 'year':
      return new Date(now.getTime() - ONE_YEAR).toISOString()
    case 'all':
      return undefined
  }
}

export type SignalStatusFilter = {
  statusActive: boolean
  statusSuspended: boolean
  statusBanned: boolean
  statusFlagged: boolean
  statusVIP: boolean
  toggleStatusActive: () => void
  toggleStatusSuspended: () => void
  toggleStatusBanned: () => void
  toggleStatusFlagged: () => void
  toggleStatusVIP: () => void
}

export default useSignals
