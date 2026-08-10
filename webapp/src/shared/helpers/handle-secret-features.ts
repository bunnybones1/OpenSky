const SECRET_SHOP_KEY = '_opensky.SECRET_SHOP'

export const isSecretShopVisibleForMe = () => {
  const value = window.localStorage.getItem(SECRET_SHOP_KEY)

  if (!!value && value === 'true') {
    return true
  }

  return false
}
