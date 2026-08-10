import styled from '@emotion/styled'
import { COUNTRIES, FlagCodes } from '@opensky/shared/constants'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { FlexBox, Text } from '~/shared/components/Base'

import { RegionSettingsRegion } from './components/RegionSettingsRegion'

interface RegionSettingsRegionsProps {
  search: string
  returnToDefaultPage: () => void
}

export const RegionSettingsRegions = memo(
  ({ search, returnToDefaultPage }: RegionSettingsRegionsProps) => {
    const { t } = useTranslation()

    const regions = useMemo<FlagCodes[]>(() => {
      if (!search) COUNTRIES

      return (Object.keys(COUNTRIES) as FlagCodes[]).filter((code) => {
        if (!search) return true

        const country = COUNTRIES[code]

        if (!country) return

        if (
          country.toLowerCase().includes(search.toLowerCase()) ||
          code.toLowerCase().includes(search.toLowerCase())
        ) {
          return true
        } else {
          return false
        }
      })
    }, [search])

    return (
      <>
        {!regions.length ? (
          <FlexBox height="100%" width="100%" type="centered-row">
            <Text
              fontSize={[18, 20, 24]}
              color="purple7"
              fontWeight="bold"
              textWrap={true}
            >
              {t(`profile.${!!search ? 'notagArtResults' : 'tagArtEmpty'}`)}
            </Text>
          </FlexBox>
        ) : (
          <RegionGrid>
            {regions.map((region) => (
              <RegionSettingsRegion
                key={region}
                code={region}
                onClick={returnToDefaultPage}
                label={COUNTRIES[region]}
              />
            ))}
          </RegionGrid>
        )}
      </>
    )
  }
)

const RegionGrid = styled.div`
  display: grid;
  height: 100%;
  width: 100%;
  padding: 0px 16px;
  grid-gap: 16px;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 40px;
`

RegionSettingsRegions.displayName = 'RegionSettingsRegions'
