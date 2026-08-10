import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '~/__deprecated__/Button'
import { Text } from '~/__deprecated__/Text'
import { Asset } from '~/shared/components/Asset'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { NAVBAR_WIDTH } from '~/shared/constants/ui'

import { DeletedAccountPageStyle } from './DeletedAccountPage.css'

const DeletedAccount = memo(() => {
  const { t } = useTranslation()

  return (
    <FlexBox
      pl={[NAVBAR_WIDTH, NAVBAR_WIDTH, NAVBAR_WIDTH, 0]}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
      type="centered-start-column"
      className={DeletedAccountPageStyle}
    >
      <FlexBox
        style={{
          width: '70%',
          maxWidth: '900px'
        }}
        type="centered-row"
      >
        <Asset
          url="webapp/backgrounds/404.webp"
          style={{
            width: '100%'
          }}
        />
      </FlexBox>
      <Text
        color="purple9"
        fontSize={[18, 18, 28]}
        fontWeight="medium"
        pt={2}
        pb={16}
        fontFamily="condensed"
      >
        {t('dashboard.delete')}
      </Text>
      <Link to={ROUTES_CONFIG.directPath}>
        <Button buttonStyle="play" width={168} height={43} onClick={() => false}>
          <FlexBox
            style={{
              width: '100%',
              height: '100%'
            }}
            type="centered-row"
          >
            <Text
              fontSize={18}
              color="white"
              fontFamily="condensed"
              fontWeight="medium"
            >
              {t('dashboard.404Button')}
            </Text>
          </FlexBox>
        </Button>
      </Link>
    </FlexBox>
  )
})

export default DeletedAccount

DeletedAccount.displayName = 'DeletedAccount'
