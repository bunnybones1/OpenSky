import styled from '@emotion/styled'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/__deprecated__/Text'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'

import { ExperienceBarType } from './ExperienceBarType'

interface Props {
  experience: number
  levelUpXP: number
  level: number
  type?: ExperienceBarType
  showXPText?: boolean
}

export const ExperienceBar = memo(
  ({
    experience,
    levelUpXP,
    level,
    type = ExperienceBarType.Normal,
    showXPText = true
  }: Props) => {
    const { t } = useTranslation()
    return (
      <ExperienceBarContainer bartype={type}>
        <FlexBox type="centered-row" position="relative" flex={1} height="100%">
          <Box
            height="6px"
            bg="purple6"
            width="100%"
            className="experiencebar__levelindicator"
          />
          <Box
            style={{
              width: experience === 0 ? '98px' : `${(experience / levelUpXP) * 100}%`
            }}
            minWidth={98}
            height="6px"
            className="experiencebar__levelindicator"
            position="absolute"
            left={0}
            top="50%"
            transform="translateY(-50%)"
            bg="#00d7fd"
            zIndex={2}
          />
          <Box
            style={{
              left: experience === 0 ? '98px' : `${(experience / levelUpXP) * 100}%`
            }}
            width="2px"
            height="10px"
            position="absolute"
            top="50%"
            transform="translateY(-50%)"
            bg="white"
            zIndex={3}
          />
          <FlexBox
            position="absolute"
            width={78}
            left={0}
            top="50%"
            transform="translateY(-50%)"
            type="centered-start-row"
            zIndex={3}
            height={14}
          >
            <Box
              style={{
                backgroundImage:
                  'linear-gradient(to bottom, #48e4ff 0%, #48e4ff 29%, #48e4ff 49%, #00d7fd 50%, #00d7fd 100%)'
              }}
              height="100%"
              width="calc(100% - 20px)"
            />
            <ExpandedXPBarAngle
              style={{
                backgroundImage:
                  'linear-gradient(to bottom, #48e4ff 0%, #48e4ff 29%, #48e4ff 49%, #00d7fd 50%, #00d7fd 100%)'
              }}
            />
            <FlexBox
              width="100%"
              height="100%"
              type="centered-row"
              position="absolute"
              top={0}
              left={0}
              zIndex={3}
            >
              <Text color="purple4" fontSize={2} fontWeight="bold" lineHeight="14px">
                {t('profile.currentLevel', { level })}
              </Text>
            </FlexBox>
          </FlexBox>
          <ExpandedXPBarShader />
        </FlexBox>

        {showXPText && (
          <FlexBox alignItems="center">
            <Text fontSize={1} color="purple9" fontWeight="bold" pl={2}>
              {`${experience}/${levelUpXP} XP`}
            </Text>
          </FlexBox>
        )}
      </ExperienceBarContainer>
    )
  }
)

ExperienceBar.displayName = 'ExperienceBar'

const NormalStyles = `
  height: 30px;
  text-align: center;
  justify-content: center;
  flex-direction: row;
  flex-wrap: no-wrap;
  padding: 0px 12px;
  border-top: 1px solid $ ${({ theme }) => theme.colors.purple6};
  background: ${({ theme }) => theme.colors.purple4};
`

const PlayBoxStyles = `
  position: absolute;
  top: 0px;
  height: 100%;
  text-align: center;
  justify-content: center;
  flex-direction: row;
  padding: 0px 12px;
  flex-wrap: no-wrap;

`

const ExperienceBarContainer = styled(FlexBox)<{
  bartype: ExperienceBarType
}>`
  width: 100%;

  position: relative;
  ${(props) => (props.bartype === ExperienceBarType.Normal ? NormalStyles : '')}
  ${(props) => (props.bartype === ExperienceBarType.PlayBox ? PlayBoxStyles : '')};
`

const ExpandedXPBarAngle = styled.div`
  position: absolute;
  top: 0;
  left: 10px;
  z-index: 1;
  width: calc(100% - 10px);
  height: 100%;
  transform: skew(20deg);
`

const ExpandedXPBarShader = styled.div`
  position: absolute;
  top: 50%;
  left: 68px;
  z-index: 2;
  width: 20px;
  height: 6px;
  transform: skew(20deg) translateY(-50%);
  background-color: rgba(35, 20, 69, 0.5);
`
