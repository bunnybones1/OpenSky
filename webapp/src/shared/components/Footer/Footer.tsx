import styled from '@emotion/styled'
import { isDevMode } from '@opensky/shared/devMode'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import env from '~/env'
import { FlexBox } from '~/shared/components/Base'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import {
  COOKIE_SETTINGS_DIALOG_ID,
  STATE_CONFIRMATION_DIALOG_ID
} from '~/shared/constants/ui'
import { useCat3State } from '~/shared/hooks/useCategoryThreeState'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'

import { GameCreditsDialog } from './components/GameCreditsDialog'
import { sourceRepositoryUrl } from './sourceRepository'

const { openDialog: openCookieSettingsDialog } = controlDialog(
  COOKIE_SETTINGS_DIALOG_ID
)
const { openDialog: openStateConfirmationDialog } = controlDialog(
  STATE_CONFIRMATION_DIALOG_ID
)

export const Footer = memo(() => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cat3State = useCat3State()
  const repositoryUrl = sourceRepositoryUrl(env.SOURCE_REPOSITORY_URL)

  const { Dialog: _GameCreditsDialog, openDialog: openGameCreditsDialog } = useDialog(
    {
      Element: GameCreditsDialog,
      id: 'GAME_CREDITS_DIALOG'
    }
  )

  const isUS =
    !!window.sessStorage &&
    !!window.sessStorage.countryCode &&
    window.sessStorage.countryCode === 'US'

  return (
    <>
      <Container>
        <ContentGrid>
          <LinkBox onClick={openCookieSettingsDialog}>{t('general.cookies')}</LinkBox>
          {(isUS || !!cat3State) && (
            <LinkBox onClick={openStateConfirmationDialog}>
              {t('general.userLocation')}
            </LinkBox>
          )}
          <LinkBox onClick={openGameCreditsDialog}>{t('general.credits')}</LinkBox>
          <LinkBox
            onClick={() => {
              navigate(ROUTES_CONFIG.routes.CACHE_INFO.directPath)
            }}
          >
            {t('general.cacheInfo')}
          </LinkBox>
          {isDevMode() && (
            <LinkBox
              onClick={() => {
                navigate(ROUTES_CONFIG.routes.SECRET_DEBUG.directPath)
              }}
            >
              {'secret debug'}
            </LinkBox>
          )}
        </ContentGrid>
        <FooterLinkContainer>
          {!!repositoryUrl && (
            <CopyrightLink href={repositoryUrl} target="_blank" rel="noreferrer">
              {repositoryUrl}
            </CopyrightLink>
          )}
        </FooterLinkContainer>
      </Container>
      {_GameCreditsDialog}
    </>
  )
})

const Container = styled(FlexBox)`
  width: 100%;
  height: auto;
  min-height: 140px;
  background: ${({ theme }) => theme.colors.purple2};
  border-top: 1px solid ${({ theme }) => theme.colors.purple6};
  position: relative;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`

const ContentGrid = styled(FlexBox)`
  display: flex;
  padding: 16px 4px;
  max-width: 800px;
  width: 100%;
  justify-content: center;
  gap: 40px;

  ${(props) => props.theme.mediaQueries.mobile} {
    gap: 18px 26px;
  }
`

const LinkBox = styled(FlexBox)`
  justify-content: center;
  color: ${({ theme }) => theme.colors.purple9};
  font-weight: 500;
  font-size: 16px;
  line-height: 22px;
  transition: all 0.2s linear;
  :hover {
    color: ${({ theme }) => theme.colors.warm8};
  }
  &.disabled {
    color: ${({ theme }) => theme.colors.baseGray};
    opacity: 0;
  }

  a {
    justify-content: center;
    color: ${({ theme }) => theme.colors.purple9};
    font-weight: 500;
    font-size: 16px;
    line-height: 22px;
    transition: all 0.2s linear;
    :hover {
      color: ${({ theme }) => theme.colors.warm8};
    }
  }
`

const FooterLinkContainer = styled(FlexBox)`
  max-width: 1440px;
  width: 100%;
  align-items: center;
  flex-direction: column;
  margin-bottom: 16px;
`

const CopyrightLink = styled.a`
  font-weight: 500;
  font-size: 13px;
  line-height: 16px;
  color: ${({ theme }) => theme.colors.purple9};
`

Footer.displayName = 'Footer'
