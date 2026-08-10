import { useParams } from 'react-router-dom'

import { useAccount } from '../queries/useAccount'

export const useActiveAccount = () => {
  const params = useParams<{ address?: string }>()

  return useAccount(params.address)
}
