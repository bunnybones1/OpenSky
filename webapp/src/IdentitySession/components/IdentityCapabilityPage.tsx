import clsx from 'clsx'
import { memo } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '~/shared/components/Button'
import { Icon, type IconTypes } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { PagePaddingStyle } from '~/shared/style/PagePaddingStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface Props {
  title: string
  description: string
  icon: IconTypes
}

export const IdentityCapabilityPage = memo(({ title, description, icon }: Props) => {
  const navigate = useNavigate()
  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          height: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }),
        PagePaddingStyle
      )}
    >
      <Icon type={icon} color="purple8" height="48px" />
      <Text
        color="white"
        fontFamily="condensed"
        fontSize={{ base: '32px', tabletWide: '50px' }}
        fontWeight="700"
        marginTop="20px"
      >
        {title}
      </Text>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <Text color="purple9" fontSize="14px" marginTop="12px">
          {description}
        </Text>
      </div>
      <div className={Sprinkles({ marginTop: '24px' })}>
        <Button
          height="52px"
          colorType="default"
          frameType="default"
          text="Back to Home"
          onClick={() => navigate(ROUTES_CONFIG.routes.HOME.directPath)}
        />
      </div>
    </div>
  )
})

IdentityCapabilityPage.displayName = 'IdentityCapabilityPage'
