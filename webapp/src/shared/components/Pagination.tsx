import styled from '@emotion/styled'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { Text } from '~/__deprecated__/Text'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { CursorPage } from '~/shared/constants/misc'

interface Props {
  onPageChange: (val) => void
  preventReset?: boolean
  className?: string
  hasBefore?: boolean
  hasAfter?: boolean
}

const Pagination = (props: Props) => {
  const update = (cursorPage: CursorPage): void => {
    props.onPageChange(cursorPage)
  }

  const { t } = useTranslation()

  return (
    <Box className={clsx(props.className)} position="absolute" width="100%">
      <FlexBox className="paginationWrapper" justifyContent="center">
        <LeftPageButton
          height={36}
          alignItems="center"
          justifyContent="center"
          px={10}
          borderRadius="4px 0px 0px 4px"
          className={props.hasAfter ? '' : 'disabled'}
          onClick={() => {
            if (props.hasAfter) {
              update(CursorPage.previous)
            }
          }}
        >
          <Text>{t('pagination.prev')}</Text>
        </LeftPageButton>
        <RightPageButton
          height={36}
          alignItems="center"
          justifyContent="center"
          px={10}
          borderRadius="0px 4px 4px 0px"
          className={props.hasBefore ? '' : 'disabled'}
          onClick={() => {
            if (props.hasBefore) {
              update(CursorPage.next)
            }
          }}
        >
          <Text>{t('pagination.next')}</Text>
        </RightPageButton>
      </FlexBox>
    </Box>
  )
}

Pagination.defaultProps = {
  defaultPage: 1
}

const PageButton = styled(FlexBox)`
  user-select: none;
  position: relative;
  transition: ${(props) => props.theme.transition};
  border: 1px solid ${(props) => props.theme.colors.purple11};
  background: linear-gradient(
    to bottom,
    #2e2152 0%,
    #2e2152 29%,
    #2e2152 49%,
    #241844 50%,
    #241844 100%
  );
  color: ${(props) => props.theme.colors.white};
  &.disabled {
    opacity: 0.5;
  }
  :hover {
    filter: drop-shadow(0 0 10px ${(props) => props.theme.colors.purple10});
    border-color: ${(props) => props.theme.colors.purple9};
    background: linear-gradient(
      to bottom,
      #3e3068 0%,
      #3e3068 29%,
      #3e3068 49%,
      #33255b 50%,
      #33255b 100%
    );
  }
  :active {
    border-color: ${(props) => props.theme.colors.purple9};
    background: ${(props) => props.theme.colors.purple8};
  }
`

const LeftPageButton = styled(PageButton)`
  border-right: none;
`

const RightPageButton = styled(PageButton)`
  border-left: none;
`

export default Pagination
