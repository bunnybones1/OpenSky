export const addTrackers = async () => {
  // @ts-ignore
  if (window && window.fbq) {
    // track conversions to optimize FB ad campaigns
    // @ts-ignore
    window.fbq('track', 'CompleteRegistration')
  }

  // CPM pixel tracking
  const existingImg = window.document.getElementById('sw-pixel')

  if (!existingImg) {
    const img = window.document.createElement('img')
    img.setAttribute('alt', '')
    img.setAttribute('width', '1')
    img.style.position = 'fixed'
    img.style.bottom = '0px'
    img.style.left = '0px'
    img.setAttribute('id', 'sw-pixel')
    img.style.pointerEvents = 'none'
    img.setAttribute('height', '1')
    img.setAttribute('src', 'https://ssl.urlpath.net/ojepn4jG0V932')
    window.document.body.appendChild(img)
  }

  //google tag
  //@ts-ignore
  gtag('event', 'conversion', {
    send_to: 'AW-10977701331/bcfFCMjfgowYENPbyfIo',
    event_callback: () => {
      console.warn('google tag fired!')
    }
  })
}
