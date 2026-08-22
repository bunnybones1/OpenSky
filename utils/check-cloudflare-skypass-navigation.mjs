import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const skypassNavigationErrors = ({
  linkSectionSource,
  skyPassLinkSource
}) => {
  const errors = []

  for (const token of [
    "import { SkyPassLink } from './components/SkyPassLink'",
    '<SkyPassLink isHorizontal={isHorizontal} />'
  ]) {
    if (!linkSectionSource.includes(token)) {
      errors.push(`original navbar is missing SkyPass integration: ${token}`)
    }
  }

  for (const token of [
    'ROUTES_CONFIG.routes.SKY_PASS.directPath',
    'isSkypassRouteSelector',
    "t('navigation.skypass')",
    'icon="sky-pass"',
    'id="skypass"',
    'isHorizontal={isHorizontal}'
  ]) {
    if (!skyPassLinkSource.includes(token)) {
      errors.push(`SkyPass navbar link is missing behavior: ${token}`)
    }
  }

  const skyPassPosition = linkSectionSource.indexOf(
    '<SkyPassLink isHorizontal={isHorizontal} />'
  )
  const playPosition = linkSectionSource.indexOf(
    '<PlayLink isHorizontal={isHorizontal} />'
  )
  if (skyPassPosition < 0 || playPosition < 0 || skyPassPosition > playPosition) {
    errors.push('SkyPass must remain visible before the primary Play action')
  }

  return errors
}

export const checkSkypassNavigation = async () => {
  const [linkSectionSource, skyPassLinkSource] = await Promise.all([
    readFile('webapp/src/AppLayout/NavBar/LinkSection/LinkSection.tsx', 'utf8'),
    readFile(
      'webapp/src/AppLayout/NavBar/LinkSection/components/SkyPassLink.tsx',
      'utf8'
    )
  ])
  const errors = skypassNavigationErrors({
    linkSectionSource,
    skyPassLinkSource
  })
  if (errors.length > 0) {
    throw new Error(`SkyPass navigation check failed:\n- ${errors.join('\n- ')}`)
  }
  return 'SkyPass navigation check passed.'
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  checkSkypassNavigation()
    .then(message => console.log(message))
    .catch(error => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
