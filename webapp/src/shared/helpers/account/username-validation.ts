export const MIN_USERNAME_LEN = 4
export const MAX_USERNAME_LEN = 20

// eslint-disable-next-line no-useless-escape
export const USERNAME_INVALIDATION_REGEXP = /[^\w\-\.]/

export const EMAIL_REGEXP =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/ // eslint-disable-line max-len

export enum UsernamePasswordValidationError {
  USERNAME_TOO_SHORT = 'Username too short',
  USERNAME_TOO_LONG = 'Username too long',
  PASSWORD_TOO_SHORT = 'Password too short',
  USERNAME_INVALID = 'Username Invalid',
  USERNAME_TAKEN = 'Username Taken'
}

export const getUsernameError = (username: string) => {
  if (username.length < MIN_USERNAME_LEN && username.length !== 0) {
    return UsernamePasswordValidationError.USERNAME_TOO_SHORT
  }

  if (username.length > MAX_USERNAME_LEN) {
    return UsernamePasswordValidationError.USERNAME_TOO_LONG
  }

  if (USERNAME_INVALIDATION_REGEXP.test(username)) {
    return UsernamePasswordValidationError.USERNAME_INVALID
  }

  return null
}

export const getEmailError = (email: string) => {
  if (!EMAIL_REGEXP.test(email)) {
    return 'Invalid Email'
  }

  return ''
}
