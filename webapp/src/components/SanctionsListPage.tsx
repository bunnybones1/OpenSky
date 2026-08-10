import styled from '@emotion/styled'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Box } from '~/shared/components/Base'

const version = '1.0'
const lastRevised = 'April 27, 2022'

// TODO: webapp-translation ==> WIP checkpoint

const SanctionsListPage = memo(() => {
  const { t } = useTranslation()
  return (
    <Container>
      <SanctionsContainer
        style={{
          gridTemplateRows: '1fr',
          maxHeight: '100%'
        }}
      >
        <ContentContainer>
          <Header>{t('support.sanctions.header')}</Header>
          <SubHeader>
            {t('support.sanctions.version')} {version}
          </SubHeader>
          <SubHeader>
            {t('support.sanctions.lastRevisedOn')}: {lastRevised} {version}
          </SubHeader>

          <SectionHeader>{t('support.sanctions.whatCountries')}</SectionHeader>

          <Block>
            <p>{t('support.sanctions.willBeBlocked')}:</p>
            <ul
              style={{
                listStyle: 'unset',
                padding: '0px 20px'
              }}
            >
              <li>Afghanistan</li>
              <li>Algeria</li>
              <li>Bangladesh</li>
              <li>Belarus</li>
              <li>Burma (Myanmar)</li>
              <li>Central African Republic</li>
              <li>China</li>
              <li>Cuba</li>
              <li>Democratic Republic of Congo</li>
              <li>Egypt</li>
              <li>Ethiopia</li>
              <li>Hong Kong (China)</li>
              <li>Iran</li>
              <li>Iraq</li>
              <li>Lebanon</li>
              <li>Libya</li>
              <li>Macao</li>
              <li>Mali</li>
              <li>Morocco</li>
              <li>Nepal</li>
              <li>Nicaragua</li>
              <li>North Korea</li>
              <li>Qatar</li>
              <li>Russia Federation</li>
              <li>Somalia</li>
              <li>South Sudan</li>
              <li>Sudan</li>
              <li>Syria</li>
              <li>Tunisia</li>
              <li>Ukraine</li>
              <li>Venezuela</li>
              <li>Yemen</li>
              <li>Zimbabwe</li>
            </ul>
          </Block>

          <Block>
            {t('support.sanctions.restrictionsLineOne')}
            {t('support.sanctions.restrictionsLineTwo')}
            {t('support.sanctions.restrictionsLineThree')}
            {t('support.sanctions.restrictionsLineFour')}
          </Block>

          <SectionHeader>{t('support.sanctions.accessibilityHeader')}</SectionHeader>

          <Block>
            {t('support.sanctions.accessibilityLineOne')}
            {t('support.sanctions.accessibilityLineTwo')}
            {t('support.sanctions.accessibilityLineThree')}:
            <ul
              style={{
                listStyle: 'unset',
                padding: '0px 20px'
              }}
            >
              <li>New Hampshire</li>
              <li>North Carolina</li>
              <li>Texas</li>
              <li>Vermont</li>
              <li>Virginia</li>
            </ul>
          </Block>

          <SectionHeader>{t('support.sanctions.marketplaceHeader')}</SectionHeader>

          <Block>
            {t('support.sanctions.marketplaceLineOne')}
            {t('support.sanctions.marketplaceLineTwo')}
            {t('support.sanctions.marketplaceLineThree')}
            {t('support.sanctions.marketplaceLineFour')}
          </Block>
        </ContentContainer>
      </SanctionsContainer>
    </Container>
  )
})

const Container = styled(Box)`
  width: 100%;
  max-height: 90vh;
`

const SanctionsContainer = styled(Box)`
  width: 100%;
  padding: 40px 20px;
  display: grid;
`

const ContentContainer = styled(Box)`
  width: 100%;
  height: 100%;
  padding: 20px;
  overflow-y: auto;
`

const Header = styled(Box)`
  font-family: Barlow Condensed;
  font-style: normal;
  font-weight: 600;
  font-size: 50px;
  line-height: 60px;
  color: #c5b4f5;
  font-family: Barlow Condensed;
  font-style: normal;
  font-weight: 500;
  font-size: 36px;
  line-height: 36px;

  text-transform: uppercase;
  margin-top: 16px;
  margin-bottom: 16px;
`

const SubHeader = styled(Box)`
  font-family: Barlow Condensed;
  font-style: normal;
  font-size: 16px;
  line-height: 60px;
  color: #c5b4f5;
  font-family: Barlow Condensed;
  font-style: normal;
  font-size: 16px;
  line-height: 16px;

  text-transform: uppercase;
  margin-top: 8px;
  margin-bottom: 8px;
`

const SectionHeader = styled(Box)`
  font-family: Barlow Condensed;
  font-style: normal;
  font-weight: 500;
  font-size: 36px;
  line-height: 36px;

  text-transform: uppercase;
  color: #ffffff;
  margin-top: 16px;
  margin-bottom: 16px;
`

const Block = styled(Box)`
  display: inline-block;
  font-family: Barlow;
  font-style: normal;
  font-weight: normal;
  font-size: 20px;
  line-height: 28px;
  align-items: center;
  color: #c5b4f5;
  margin-top: 8px;
  margin-bottom: 8px;
  a {
    color: ${({ theme }) => theme.colors.cold8};
  }

  a:visited {
    color: ${({ theme }) => theme.colors.warm6};
  }
`

export default SanctionsListPage

SanctionsListPage.displayName = 'SanctionsListPage'
