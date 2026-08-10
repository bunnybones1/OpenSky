import styled from '@emotion/styled'
import clsx from 'clsx'
import { memo, ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { Text } from '~/__deprecated__/Text'
import { Asset } from '~/shared/components/Asset'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'

import { MOBILE_SUBNAV_HEIGHT, SUBNAV_HEIGHT } from '../shared/constants/ui'

export interface SubNavProps {
  subRoutes: {
    to: string
    label: string
    isActive?: boolean
    icon?: IconTypes
    id: string
  }[]
}

interface LinkComponentToUseProps {
  isActive?: boolean
  children: ReactNode
  to: string
}

const LinkComponentToUse = memo(
  ({ isActive, children, to }: LinkComponentToUseProps) => {
    if (isActive === undefined) {
      return (
        <NavLink
          to={to}
          className={({ isActive }) => clsx('subNavLink', { isActive })}
        >
          {children}
        </NavLink>
      )
    } else {
      return (
        <Link to={to} className={clsx('subNavLink', { isActive })}>
          {children}
        </Link>
      )
    }
  }
)

LinkComponentToUse.displayName = 'LinkComponentToUse'

const IconHeight = { base: '14px', tabletWide: '16px' } as const

/**
 * @deprecated Use ~/shared/components/SubNav
 */
export const SubNav = memo(({ subRoutes }: SubNavProps) => {
  return (
    <SubNavContainer
      width="100%"
      type="centered-row"
      height={[
        MOBILE_SUBNAV_HEIGHT,
        MOBILE_SUBNAV_HEIGHT,
        MOBILE_SUBNAV_HEIGHT,
        SUBNAV_HEIGHT
      ]}
      bg="purple1"
      zIndex={2}
    >
      <SubNavLinkWrapper height="100%" type="centered-row" width="auto">
        <Divider />
        {subRoutes.map((route) => (
          <LinkComponentToUse to={route.to} key={route.to} isActive={route.isActive}>
            <SubNavButton
              data-link-id={route.id}
              padding={['0px 12px', '0px 12px', '0px 12px', '0px 20px']}
            >
              {!!route.icon && (
                <FlexBox
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%'
                  }}
                  padding={['0px 2px', '0px 2px', '0px 2px', '0px 3px']}
                >
                  <Icon type={route.icon} height={IconHeight} color="purple8" />
                </FlexBox>
              )}
              <Text
                fontSize={[12, 12, 12, 16]}
                fontWeight="500"
                fontFamily="condensed"
                margin={['0px 3px', '0px 3px', '0px 3px', '0px 4px']}
                color="purple9"
              >
                {route.label}
              </Text>
              <Asset
                url="webapp/backgrounds/selected-desktop.webp"
                className="subNavLink_activeGlow"
              />
            </SubNavButton>
            <ActiveBg />
            <Divider />
          </LinkComponentToUse>
        ))}
      </SubNavLinkWrapper>
    </SubNavContainer>
  )
})

SubNav.displayName = 'SubNav'

const SubNavContainer = styled(FlexBox)`
  border-bottom: 1px solid ${(props) => props.theme.colors.purple7};
`

const ActiveBg = styled.div`
  opacity: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(94, 62, 185, 0) 48%,
    rgba(94, 62, 185, 0.45) 100%
  );
  position: absolute;
`

const SubNavLinkWrapper = styled(FlexBox)`
  .subNavLink {
    display: flex;
    height: 100%;
    flex-direction: row;
    align-items: center;
    position: relative;
    text-transform: uppercase;
    &_activeGlow {
      position: absolute;
      bottom: 0;
      width: 80px;
      left: 50%;
      transform: translateX(-50%);
      opacity: 0;
      transition: opacity 0.15s ease-out;
    }
    .sequence-platforms-text {
      transition: color 0.15s ease-out;
      color: ${(props) => props.theme.colors.purple9};
      letter-spacing: 1px;
    }
    &:hover {
      .sequence-platforms-text {
        color: ${(props) => props.theme.colors.white};
      }
      ${ActiveBg} {
        opacity: 1;
      }
      .horizon-icon {
        fill: ${(props) => props.theme.colors.white};
      }
    }
    &.isActive {
      .sequence-platforms-text {
        color: ${(props) => props.theme.colors.white};
      }
      ${ActiveBg} {
        opacity: 1;
      }
      .subNavLink_activeGlow {
        opacity: 1;
        height: 20px;
      }
      .horizon-icon {
        fill: ${(props) => props.theme.colors.white};
      }
    }
  }
`

const SubNavButton = styled(FlexBox)`
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  z-index: 2;
`

const Divider = styled(FlexBox)`
  width: 1px;
  height: 100%;
  background: linear-gradient(
    0deg,
    ${(props) => props.theme.colors.purple7},
    ${(props) => props.theme.colors.purple6},
    ${(props) => props.theme.colors.purple4},
    ${(props) => props.theme.colors.purple3},
    ${(props) => props.theme.colors.purple1}
  );
`
