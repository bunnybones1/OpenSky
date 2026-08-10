import { useEffect, useState } from 'react'

import { APIClient } from '~/shared/clients'

// TODO: Move this to react-query
const useAdminAuth = (address?: string) => {
  const [isAdmin, setIsAdmin] = useState<boolean>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    if (address) {
      APIClient.opensky
        .gMIsAccountBanned({ account: address })
        .then(() => setIsAdmin(true))
        .catch(() => {
          setIsAdmin(false)
          // console.log(err.message)
        })
        .finally(() => setLoading(false))
    }
  }, [address])

  return { isAdmin, loading }
}

export default useAdminAuth
