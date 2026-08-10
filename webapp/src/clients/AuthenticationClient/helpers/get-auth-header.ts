import env from '~/env'

export const getAuthHeaders = (jwt: string) => {
  return {
    Release: env.GITCOMMIT,
    Authorization: `BEARER ${jwt}`
  }
}
