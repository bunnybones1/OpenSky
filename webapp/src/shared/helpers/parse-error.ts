import { i18n } from '@opensky/language-manager'

export const parseError = (error: any) => {
  const err: Error =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      : typeof error === 'object' &&
        'msg' in error &&
        'cause' in error &&
        'code' in error
      ? {
          name: error.msg,
          message: `${i18n.t('support.error')}:\n    ${error.code}\n\n${i18n.t(
            'support.errorCause'
          )}:\n    ${error.cause}`,
          stack: ''
        }
      : {
          name: '',
          message: '',
          stack: ''
        }

  return err
}
