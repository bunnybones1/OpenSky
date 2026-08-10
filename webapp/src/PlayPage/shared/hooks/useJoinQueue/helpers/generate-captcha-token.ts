import env from '~/env'

export const generateCaptchaToken = async () => {
  if (env.CAPTCHA2_SITE_KEY.length === 0) {
    return undefined
  }

  const hcaptcha: any = (window as any).hcaptcha

  if (!hcaptcha) {
    throw Error('captcha load fail')
  }

  const hcaptchaWidgetId = (window as any).hcaptchaWidgetId

  if (!hcaptchaWidgetId || hcaptchaWidgetId.length === 0) {
    throw Error('captcha widget id not set')
  }

  try {
    const verifyToken = await hcaptcha.execute(hcaptchaWidgetId, {
      async: true
    })

    return verifyToken
  } catch (err) {
    return null
  }
}
