import styled from '@emotion/styled'
import { getBaseID } from '@opensky/shared/assetsIDs'
import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import ReactTooltip from 'react-tooltip'

import { Box, FlexBox, Text } from '~/shared/components/Base'
import { CardImage } from '~/shared/components/CardImage/CardImage'
import { Icon } from '~/shared/components/Icon/Icon'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GameCreditsDialogStyle } from './GameCreditsDialog.css'

export const GameCreditsDialog = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const isTabletWide = useResponsiveQuery('tabletWide')

  return (
    <div className={clsx(GameCreditsDialogStyle, Sprinkles({ display: 'grid' }))}>
      {isTabletWide && (
        <ReactTooltip
          id="credits__card"
          delayShow={200}
          backgroundColor={'rgba(0,0,0,0)'}
          place="right"
          getContent={(cardId: string) => {
            if (cardId) {
              return (
                <Box width={230} height={200}>
                  <CardImage id={getBaseID(cardId)} />
                  <FlexBox
                    backgroundColor="purple1"
                    border="1px solid"
                    borderColor="purple6"
                    style={{
                      fontSize: '14px',
                      margin: '0 auto',
                      position: 'relative',
                      left: '5px'
                    }}
                    width="120px"
                    type="centered-row"
                    p="4px"
                  >
                    {t('general.favoriteCard')}
                  </FlexBox>
                </Box>
              )
            }
            return null
          }}
        />
      )}

      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          borderBottom: '1px solid',
          borderColor: 'purple7',
          backgroundColor: 'purple2'
        })}
      >
        <TitleDetail title={t('general.CREDITS')} />
      </div>
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          backgroundColor: 'purple1',
          padding: { base: '16px', tabletWide: '48px' },
          overflow: 'auto',
          position: 'relative'
        })}
      >
        <Box
          style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '30%',
            margin: '24px 0px'
          }}
        >
          {!!getAssetUrl && (
            <Box
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundImage: `url(${getAssetUrl(
                  'webapp/misc/creditsbanner.webp'
                )})`
              }}
            />
          )}
        </Box>
        <Header style={{ textAlign: 'center' }}>{t('credits.developedBy')}</Header>
        {!!getAssetUrl && (
          <>
            <img
              src={getAssetUrl('webapp/misc/sequencelogo.webp')}
              style={{
                width: '100%',
                maxWidth: '198px',
                margin: '0 auto',
                display: 'block'
              }}
            />
            <img
              src={getAssetUrl('webapp/misc/madewithlove.webp')}
              style={{
                width: '100%',
                maxWidth: '336px',
                margin: '0 auto',
                display: 'block',
                marginTop: '40px'
              }}
            />
          </>
        )}
        <CreditSection>
          <Header>{t('credits.founders')}</Header>
          <Credit>Peter Kieltyka</Credit>
          <Credit data-for="credits__card" data-tip={'2011'}>
            Ian Ha
          </Credit>
          <Credit data-for="credits__card" data-tip={'2030'}>
            William Hua
          </Credit>
          <Credit data-for="credits__card" data-tip={'2079'}>
            Daniel Racca
          </Credit>
          <Credit data-for="credits__card" data-tip={'1010'}>
            Michael Sanders
          </Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.gameProductDirectors')}</Header>
          <Credit data-for="credits__card" data-tip={'2079'}>
            Daniel Racca
          </Credit>
          <Credit data-for="credits__card" data-tip={'20000'}>
            Philippe Castonguay
          </Credit>
          <Credit>Eddie Fear</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.leadGameDeveloper')}</Header>
          <Credit data-for="credits__card" data-tip={'3000'}>
            Tomasz Dysinski
          </Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.gameDevelopers')}</Header>
          <Credit data-for="credits__card" data-tip={'16741745'}>
            Ari Lotter
          </Credit>
          <Credit>Corban Riley</Credit>
          <Credit data-for="credits__card" data-tip={'2030'}>
            William Hua
          </Credit>
          <Credit data-for="credits__card" data-tip={'4036'}>
            Timmith Dysinski
          </Credit>
          <Credit data-for="credits__card" data-tip={'4118'}>
            Ramin Kaviani-Arani
          </Credit>
          <Credit>Bia Zhao</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.webMobileDevelopers')}</Header>
          <Credit data-for="credits__card" data-tip={'3003'}>
            Daniel Rea
          </Credit>
          <Credit>Corban Riley</Credit>
          <Credit data-for="credits__card" data-tip={'1063'}>
            Michael Yu
          </Credit>
          <Credit>Peter Kieltyka</Credit>
          <Credit data-for="credits__card" data-tip={'9'}>
            Chad Nehemiah
          </Credit>
          <Credit data-for="credits__card" data-tip={'4042'}>
            Scott Dodge
          </Credit>
          <Credit data-for="credits__card" data-tip={'12'}>
            Tolgahan Arikan
          </Credit>
          <Credit>Ryan Crockett</Credit>
          <Credit>Paul Xu</Credit>
          <Credit>Andreea Draghicescu</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.backEndDevelopers')}</Header>
          <Credit>Peter Kieltyka</Credit>
          <Credit data-for="credits__card" data-tip={'2074'}>
            Maciej Lisiewski
          </Credit>
          <Credit>Jose Nieto</Credit>
          <Credit data-for="credits__card" data-tip={'2030'}>
            William Hua
          </Credit>
          <Credit data-for="credits__card" data-tip={'1063'}>
            Michael Yu
          </Credit>
          <Credit data-for="credits__card" data-tip={'20000'}>
            Philippe Castonguay
          </Credit>
          <Credit>Agustin Aguilar</Credit>
          <Credit>Shubhaankar Sharma</Credit>
          <Credit>Jakub Zapletal</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.blockchainDevelopers')}</Header>
          <Credit>Agustin Aguilar</Credit>
          <Credit data-for="credits__card" data-tip={'20000'}>
            Philippe Castonguay
          </Credit>
          <Credit data-for="credits__card" data-tip={'2030'}>
            William Hua
          </Credit>
          <Credit>Peter Kieltyka</Credit>
          <Credit data-for="credits__card" data-tip={'1063'}>
            Michael Yu
          </Credit>
          <Credit data-for="credits__card" data-tip={'12'}>
            Tolgahan Arikan
          </Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.UXDesign')}</Header>
          <Credit data-for="credits__card" data-tip={'2079'}>
            Daniel Racca
          </Credit>
          <Credit>Luciano Castillo</Credit>
          <Credit>Dora Cruceru</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.economyDesign')}</Header>
          <Credit data-for="credits__card" data-tip={'20000'}>
            Philippe Castonguay
          </Credit>
          <Credit data-for="credits__card" data-tip={'4089'}>
            Salvatore Grosso
          </Credit>
          <Credit>André Luna</Credit>
          <Credit>Robert Petit</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.gameDesign')}</Header>
          <Credit data-for="credits__card" data-tip={'4042'}>
            Coulter Baker
          </Credit>
          <Credit>Jonathon Loucks</Credit>
          <Credit data-for="credits__card" data-tip={'4052'}>
            Matthew Shera
          </Credit>
          <Credit data-for="credits__card" data-tip={'4089'}>
            Salvatore Grosso
          </Credit>
          <Credit>Tao Huang</Credit>
          <Credit>Nigel Pannek</Credit>
          <Credit>Cindy Vu</Credit>
          <Credit>Robert Holmes</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.gameStory')}</Header>
          <Credit data-for="credits__card" data-tip={'2079'}>
            Daniel Racca
          </Credit>
          <Credit data-for="credits__card" data-tip={'4042'}>
            Coulter Baker
          </Credit>
          <Credit data-for="credits__card" data-tip={'3010'}>
            Marcelo Suplicy
          </Credit>
          <Credit data-for="credits__card" data-tip={'4052'}>
            Matthew Shera
          </Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.community')}</Header>
          <Credit data-for="credits__card" data-tip={'3010'}>
            Marcelo Suplicy
          </Credit>
          <Credit data-for="credits__card" data-tip={'4015'}>
            Ashavari Joshi
          </Credit>
          <Credit>Eduardo Ferra</Credit>
          <Credit>Karly Lariza</Credit>
          <Credit>Jessie Lee</Credit>
          <Credit>Kriselle Punzalan</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.marketing')}</Header>
          <Credit data-for="credits__card" data-tip={'3000'}>
            Hanny Duong
          </Credit>
          <Credit data-for="credits__card" data-tip={'1010'}>
            Michael Sanders
          </Credit>
          <Credit data-for="credits__card" data-tip={'4089'}>
            Salvatore Grosso
          </Credit>
          <Credit data-for="credits__card" data-tip={'3010'}>
            Marcelo Suplicy
          </Credit>
          <Credit data-for="credits__card" data-tip={'3074'}>
            Tristan Maurice
          </Credit>
          <Credit>Alexis Beverly</Credit>
          <Credit data-for="credits__card" data-tip={'4015'}>
            Ashavari Joshi
          </Credit>
          <Credit data-for="credits__card" data-tip={'3036'}>
            John Stasi
          </Credit>
          <Credit>Raymond Cheung</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.qualityAssurance')}</Header>
          <Credit data-for="credits__card" data-tip={'4098'}>
            Nikki Gaudreau
          </Credit>
          <Credit data-for="credits__card" data-tip={'4042'}>
            Coulter Baker
          </Credit>
          <Credit>Peter Kieltyka</Credit>
          <Credit data-for="credits__card" data-tip={'20000'}>
            Philippe Castonguay
          </Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.finance&Operations')}</Header>
          <Credit>Deborah Marfurt</Credit>
          <Credit data-for="credits__card" data-tip={'2011'}>
            Ian Ha
          </Credit>
          <Credit>Martha Ainsley</Credit>
          <Credit>Harshesh Patel</Credit>
          <Credit>Aditya Kolekar</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.legal')}</Header>
          <Credit>Angela Angelovska-Wilson (DLx Law)</Credit>
          <Credit>Greg Strong (DLx Law)</Credit>
          <Credit>James Rooney</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.dataAnalytics&Research')}</Header>
          <Credit data-for="credits__card" data-tip={'2011'}>
            Ian Ha
          </Credit>
          <Credit data-for="credits__card" data-tip={'3010'}>
            Tim Small
          </Credit>
          <Credit>Toan Nguyen</Credit>
          <Credit>Tanya Stemberger</Credit>
          <Credit>Alexandra Lowe</Credit>
          <Credit>Mehmet Turan</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.artDirection')}</Header>
          <Credit data-for="credits__card" data-tip={'2079'}>
            Daniel Racca
          </Credit>
          <Credit data-for="credits__card" data-tip={'4078'}>
            Renato Giacomini
          </Credit>
          <Credit>Erlandson Ferreira</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.art')}</Header>
          <Credit data-for="credits__card" data-tip={'4063'}>
            Lobo Borges
          </Credit>
          <Credit data-for="credits__card" data-tip={'3096'}>
            Henrique Xavier
          </Credit>
          <Credit data-for="credits__card" data-tip={'4078'}>
            Renato Giacomini
          </Credit>
          <Credit data-for="credits__card" data-tip={'4092'}>
            Edvan Soares
          </Credit>
          <Credit>Casey Edwards</Credit>
          <Credit data-for="credits__card" data-tip={'3071'}>
            Lauren Westlake
          </Credit>
          <Credit data-for="credits__card" data-tip={'1083'}>
            Patty Arroyo
          </Credit>
          <Credit>Tiago Sousa</Credit>
          <Credit>Rafael De Latorre</Credit>
          <Credit>Erlandson Mayslan</Credit>
          <Credit>Mailon Karr</Credit>
          <Credit>Priscilla Tramontano</Credit>
          <Credit>Leoni Fezz</Credit>
          <Credit>Rodrgio Pascoal</Credit>
          <Credit>Minh Kieu</Credit>
          <Credit data-for="credits__card" data-tip={'4020'}>
            Juan Calle
          </Credit>
          <Credit>Carlos Cruz Quijada</Credit>
          <Credit>André de Freitas Cardozo</Credit>
          <Credit>Fábio Perez</Credit>
          <Credit>Kevin Gnutzmans</Credit>
          <Credit>Michelle Lo</Credit>
          <Credit>Desiree Moffatt</Credit>
          <Credit>Rong Chen</Credit>
          <Credit>Igor Shapochkin</Credit>
          <Credit>Labros Panousis</Credit>
          <Credit>Ksenia Sharavina</Credit>
          <Credit data-for="credits__card" data-tip={'7'}>
            Bruno Tonello
          </Credit>
          <Credit>Stefano Puddu</Credit>
          <Credit>Gabriel Rubio</Credit>
          <Credit>Gabriel Scavariello</Credit>
          <Credit>Daniel Bogni</Credit>
          <Credit>João Bragato</Credit>
          <Credit>Diego Machuca</Credit>
          <Credit>Vinicius Cardoso</Credit>
          <Credit>Đinh Minh Thành</Credit>
          <Credit>Brian Wells</Credit>
          <Credit>Kalani Lindsey</Credit>
          <Credit>Andrew Trabbold</Credit>
          <Credit>Felipe Jorge Cunha</Credit>
          <Credit>Marcos Vinicius Batista</Credit>
          <Credit>Paulo Sampaio</Credit>
          <Credit data-for="credits__card" data-tip={'2079'}>
            Daniel Racca
          </Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.animation')}</Header>
          <Credit data-for="credits__card" data-tip={'3000'}>
            Tomasz Dysinski
          </Credit>
          <Credit>Peter Bukk</Credit>
          <Credit>Yoho Hang Yue</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.3DModelling')}</Header>
          <Credit data-for="credits__card" data-tip={'3071'}>
            Lauren Westlake
          </Credit>
          <Credit data-for="credits__card" data-tip={'3000'}>
            Tomasz Dysinski
          </Credit>
          <Credit data-for="credits__card" data-tip={'4036'}>
            Timmith Dysinski
          </Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.music&SFX')}</Header>
          <Credit>Russell Shaw</Credit>
          <Credit>Erik Hughes</Credit>
          <Credit>Winifred Phillips</Credit>
          <Credit>Roxy Moon</Credit>
          <Credit>Alberto Jossue</Credit>
          <Credit>Liam Brand</Credit>
          <Credit>PJ Tremblay</Credit>
          <Credit data-for="credits__card" data-tip={'20029'}>
            Alex Haisting
          </Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.honorableMentions')}</Header>
          <Credit>Werfs</Credit>
          <Credit>Missaurus</Credit>
          <Credit>Joss Stardad</Credit>
          <Credit>Puza</Credit>
          <Credit>Hypo Last</Credit>
          <Credit>Ghelas</Credit>
          <Credit>Eufrat</Credit>
          <Credit>Tuizzzz</Credit>
          <Credit>JustSayBacon</Credit>
          <Credit>Mantichore</Credit>
          <Credit>Magical</Credit>
          <Credit>Gaara</Credit>
          <Credit>Justlolaman</Credit>
          <Credit>{t('credits.manyOthers')}</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.investors')}</Header>
          <Credit>Initialized Capital</Credit>
          <Credit>Golden Ventures</Credit>
          <Credit>CMT Digital</Credit>
          <Credit>BITKRAFT Ventures</Credit>
          <Credit>Regah Ventures</Credit>
          <Credit>Polychain</Credit>
          <Credit>Digital Currency Group</Credit>
          <Credit>ConsenSys</Credit>
          <Credit>Coinbase</Credit>
          <Credit>The Xchange Company</Credit>
          <Credit>Khaled Verjee</Credit>
          <Credit>Zyshan Kaba</Credit>
          <Credit>iNovia</Credit>
          <Credit>Andromeda</Credit>
          <Credit>Todd Finch</Credit>
          <Credit>Douglas Munsey</Credit>
          <Credit>Two Small Fish Ventures</Credit>
          <Credit>Chris Gonsalves</Credit>
          <Credit>Chris Ye</Credit>
          <Credit>Fred Ehrsam</Credit>
          <Credit>Jeff Leventhal</Credit>
        </CreditSection>

        <CreditSection>
          <Header>{t('credits.specialThanks')}</Header>
          <Credit>Alexis Ohanian</Credit>
          <Credit>Liam Horne</Credit>
          <Credit>Josh Stark</Credit>
          <Credit>Julia Ricci</Credit>
          <Credit>Todd Finch</Credit>
          <Credit>Ameet Shah</Credit>
          <Credit>Brett Gibson</Credit>
          <Credit>Colleen Sullivan</Credit>
          <Credit>Moritz Baier-Lentz</Credit>
          <Credit>Raphael Carrier</Credit>
          <Credit>Connor Spelliscy</Credit>
          <Credit>Robbie Bent</Credit>
          <Credit>Ken Nickerson</Credit>
          <Credit>Thomas Carey</Credit>
          <Credit>Peter Li</Credit>
          <Credit>Timur Fattahov</Credit>
          <Credit>Wayne Sang</Credit>
          <Credit>Huwiz</Credit>
          <Credit>Consensys Diligence</Credit>
          <Credit>{t('credits.allOurAlphaAndBetaTesters')}</Credit>
        </CreditSection>

        <Icon type="opensky" height="48px" color="white" />
      </div>
    </div>
  )
})

const Header = styled(Text)`
  color: ${(props) => props.theme.colors.purple8};
  font-family: 'Barlow Condensed';
  font-weight: 500;
  line-height: 36px;
  font-size: 24px;
`

const CreditSection = styled(FlexBox)`
  margin: 48px 0px;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`

const Credit = styled(FlexBox)`
  font-size: 18px;
  color: white;
  margin: 3px 0px;
  cursor: pointer;
  font-weight: 500;
  text-align: center;
  transition: all 0.1s linear;
  max-width: 50%;
  &:hover {
    color: ${(props) => props.theme.colors.warm6};
  }
`

GameCreditsDialog.displayName = 'GameCreditsDialog'
